#[allow(unused)]
use tracing::{trace, debug, info, warn, error, instrument, Level};

use std::io::Read;
use std::path::{Path, PathBuf};
use std::collections::HashMap;

use html_editor::Node;

use configurafox::{
    run,
    ConfigurafoxError,
    resource_manager::{ResourceManager, Resource},
    treewalker::{get_attr, Context, TreeWalker, KatexReplacer, VariableReplacer, LinkReplacer, SyntaxHighlighter, walk},

    ResourceProcessor, IdentityProcessor, HTMLProcessor,
};

#[derive(Clone, PartialEq, Eq, Hash, Debug)]
enum CSResource {
    TopLevelHTML(String), // Filename without .html extension
    BlogPost { identifier: String },

    Resource(String), // Filename in the resources/ folder
    Splash(String), // Filename without .png extension in the splashes/ folder
    SplashFullRes(String), // Identical to Splash, but processed with IdentityProcessor instead of ImageCompressor
    Photo(String, String), PhotoFullRes(String, String), // album, photo (implied .jpg extension)
}

impl Resource for CSResource {
    fn identifier(&self) -> String {
        match self {
            CSResource::TopLevelHTML(name) => format!("html-{name}"),
            CSResource::BlogPost { identifier } => format!("blog-{identifier}"),
            CSResource::Resource(filename) => format!("resource-{filename}"),
            CSResource::Splash(s) => format!("splash-{s}"),
            CSResource::SplashFullRes(s) => format!("splash-fullres-{s}"),
            CSResource::Photo(album, photo) => format!("photo-{album}-{photo}"),
            CSResource::PhotoFullRes(album, photo) => format!("photo-fullres-{album}-{photo}"),
        }
    }

    fn output_path(&self) -> PathBuf {
        match self {
            CSResource::TopLevelHTML(name) => PathBuf::from(format!("{name}.html")),
            CSResource::BlogPost { identifier } => vec!["blogs".into(), format!("{identifier}.html")].into_iter().collect(),
            CSResource::Resource(filename) => vec!["resources", &filename].into_iter().collect(),
            CSResource::Splash(s) => vec!["splash".into(), format!("{s}.jpg")].into_iter().collect(),
            CSResource::SplashFullRes(s) => vec!["splash".into(), format!("{s}.png")].into_iter().collect(),
            CSResource::Photo(album, photo) => vec!["photos".into(), format!("{album}-{photo}.jpg")].into_iter().collect(),
            CSResource::PhotoFullRes(album, photo) => vec!["photos-fullres".into(), format!("{album}-{photo}.jpg")].into_iter().collect(),
        }
    }
}

#[derive(serde::Deserialize, Debug, Clone)]
#[serde(deny_unknown_fields)]
struct CSConfig {
    blogs: Vec<Blog>,
    #[serde(rename = "blogs-wip")]
    blogs_wip: Vec<BlogWip>,

    internal_links: Vec<Link>,
    external_links: Vec<Link>,

    albums: HashMap<String, PhotoAlbum>,
}

impl CSConfig {
    fn blog_with_ident(&self, ident: &str) -> Option<&Blog> {
        self.blogs.iter().filter(|x| &x.identifier == ident).next()
    }
}

#[derive(serde::Deserialize, Debug, Clone)]
#[serde(deny_unknown_fields)]
struct Photo {
    photo: String,
    alt: String,
    size: Option<PhotoSize>,
}

#[derive(serde::Deserialize, Debug, Clone)]
#[serde(deny_unknown_fields)]
enum PhotoSize {
    Double, Triple, Tall,
}

#[derive(serde::Deserialize, Debug, Clone)]
#[serde(deny_unknown_fields)]
struct PhotoAlbum {
    name: String,
    date: toml::value::Datetime,
    photos: Vec<Photo>,
}


#[derive(serde::Deserialize, Debug, Clone)]
#[serde(deny_unknown_fields)]
struct Blog {
    identifier: String,
    title: String,
    tagline: String,
    #[serde(rename = "written-at")]
    written_at: toml::value::Datetime,
}


impl Blog {
    fn vars(&self) -> std::collections::HashMap<String, String> {
        vec![
            ("blog_url".to_string(), format!("@blog-{}", self.identifier)),
            ("blog_title".to_string(), self.title.clone()),
            ("blog_tagline".to_string(), self.tagline.clone()),
            ("blog_date".to_string(), format!("{}", self.written_at)),
        ].into_iter().collect()
    }
}

#[derive(serde::Deserialize, Debug, Clone)]
#[serde(deny_unknown_fields)]
struct Link {
    title: String,
    href: String,
    desc: String,
}

#[derive(serde::Deserialize, Debug, Clone)]
#[serde(deny_unknown_fields)]
struct BlogWip {
    title: String,
    tagline: String,
}

fn handle<'data>(_path: &Path, r: &CSResource, conf: &'data CSConfig) -> Box<dyn ResourceProcessor<CSResource> + 'data> {
    let mut walkers: Vec<Box<dyn TreeWalker<_, _>>> = vec![
        Box::new(StandardMetaReplacer),
        Box::new(SplashPhotoReplacer),
        Box::new(KatexReplacer),
        Box::new(LinkReplacer),
        Box::new(Links),
        Box::new(Albums),
        Box::new(Shortcodes),
        Box::new(SyntaxHighlighter::default("base16-ocean.dark")),
    ];

    match r {
        CSResource::TopLevelHTML(_) => {
            walkers.push(Box::new(BlogpostReplacer));
            Box::new(HTMLProcessor {
                walkers,
                trim: false,
                data: conf,
            })
        },
        CSResource::BlogPost { identifier } => {
            let Some(blog) = conf.blog_with_ident(identifier) else {
                eprintln!("Blog not found: {identifier}");
                return Box::new(HTMLProcessor {
                    walkers,
                    trim: false,
                    data: conf,
                });
            };

            walkers.push(Box::new(VariableReplacer(blog.vars())));

            Box::new(HTMLProcessor {
                walkers,
                trim: false,
                data: conf,
            })
        }
        CSResource::Splash(_) | CSResource::Photo(_, _) => Box::new(ImageCompressor {
            max_size: [1000, 1000],
            output_quality: 85,
            guess_format: false,
        }),
        CSResource::SplashFullRes(_) | CSResource::PhotoFullRes(_, _)  => Box::new(IdentityProcessor),

        CSResource::Resource(_) => Box::new(IdentityProcessor),
    }
}

fn main() -> std::io::Result<()> {
    setup_tracing_env();

    let Some(output_path) = std::env::args().skip(1).next() else {
        eprintln!("Please run with destination path");
        std::process::exit(1);
    };

    let project_root = PathBuf::from("site");

    let conf_path = {
        let mut conf_path = project_root.clone();
        conf_path.push("config.toml");
        conf_path
    };

    let mut config_file = std::fs::File::open(conf_path)?;
    let mut config_contents = String::new();
    config_file.read_to_string(&mut config_contents)?;
    drop(config_file);

    let config: CSConfig = toml::from_str(&config_contents).expect("Couldn't parse content");

    let mut context: ResourceManager<CSResource> = ResourceManager::new(
        project_root,
    );

    context.register_all_files_in_directory(
        PathBuf::from("blog"),
        |path| {
            let filename = path.file_name().and_then(|x| x.to_str())?;

            let (ident, "html") = filename.rsplit_once('.')? else {
                return None;
            };

            let blog = config.blog_with_ident(ident)?;

            Some(CSResource::BlogPost {
                identifier: blog.identifier.clone(),
            })
        },
        false,
    )?;

    context.register_all_files_in_directory(
        PathBuf::from("."),
        |path| {
            let filename = path.file_name().and_then(|x| x.to_str())?;

            let (name, "html") = filename.rsplit_once('.')? else {
                return None;
            };

            Some(CSResource::TopLevelHTML(name.to_string()))
        },
        false,
    )?;

    context.register_all_files_in_directory(
        PathBuf::from("resources"),
        |path| {
            let filename = path.file_name().and_then(|x| x.to_str())?;

            Some(CSResource::Resource(filename.to_string()))
        },
        false,
    )?;

    // TODO: Merge these somehow
    for fullres in [false, true] {
        context.register_all_files_in_directory(
            PathBuf::from("splash"),
            |path| {
                let filename = path.file_name().and_then(|x| x.to_str())?;

                let (name, "png") = filename.rsplit_once('.')? else {
                    return None;
                };

                if fullres {
                    Some(CSResource::SplashFullRes(name.to_string()))
                } else {
                    Some(CSResource::Splash(name.to_string()))
                }
            },
            false,
        )?;

        context.register_all_files_in_directory(
            PathBuf::from("photos"),
            |path| {
                let filename = path.file_name().and_then(|x| x.to_str())?;
                let parent = path.parent().and_then(|x| x.file_name()).and_then(|x| x.to_str())?;

                let (name, "jpg" | "JPG") = filename.rsplit_once('.')? else {
                    return None;
                };

                if fullres {
                    Some(CSResource::PhotoFullRes(parent.to_string(), name.to_string()))
                } else {
                    Some(CSResource::Photo(parent.to_string(), name.to_string()))
                }
            },
            true,
        )?;
    };

    for (resource, path) in context.all_registered_files() {
        eprintln!("  {} @ {}", resource.identifier(), path.display());
    }

    if let Err(e) = run(
        &PathBuf::from(output_path),
        &context,
        |path, r, data| handle(path, r, data),
        &config,
    ) {
        eprintln!("epic fail");
        eprintln!("{e:?}");
        std::process::exit(1);
    }

    Ok(())
}

fn setup_tracing_env() {
    tracing_subscriber::FmtSubscriber::builder()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    debug!("Set up tracing");
}

struct StandardMetaReplacer;

impl TreeWalker<CSResource, CSConfig> for StandardMetaReplacer {
    fn describe(&self) -> String {
        "StandardMetaReplacer".to_string()
    }

    fn matches(&self, element_name: &str, _attrs: &[(String, String)], _ctx: Context<'_, '_, CSResource, CSConfig>) -> bool {
        element_name == "standard-meta"
    }

    fn replace(&self, _tag: &str, attrs: Vec<(String, String)>, _children: Vec<Node>, ctx: Context<'_, '_, CSResource, CSConfig>) -> Result<Vec<Node>, ConfigurafoxError> {
        let meta_charset = Node::new_element(
            "meta",
            vec![("charset", "UTF-8")],
            vec![],
        );

        let title_attr = get_attr(&attrs, "title").map(|x| x.to_owned());
        let blog = if let CSResource::BlogPost { identifier } = ctx.resource {
            ctx.data.blog_with_ident(&identifier)
        } else {
            None
        };

        let title = title_attr.or(blog.map(|blog| format!("{} - writing @ coral.shoes", blog.title)));
        let title = title.ok_or(ConfigurafoxError::Other("No title specified".to_string()))?;

        let title_elem = Node::new_element(
            "title",
            vec![],
            vec![Node::Text(title.to_string())],
        );

        let meta_iloinlxlvi = Node::new_element(
            "meta",
            vec![("name", "iloinlxlvi"), ("content", "https://coral.shoes/iloinlxlvi.json")],
            vec![],
        );

        let mut style_default = vec![Node::new_element(
            "link",
            vec![("rel", "stylesheet"), ("href", "@resource-main.css")],
            vec![],
        )];

        walk(&mut style_default, &[Box::new(LinkReplacer)], ctx)?;

        let mut res = vec![meta_charset, title_elem, meta_iloinlxlvi];

        res.extend(style_default);

        Ok(res)
    }
}

struct SplashPhotoReplacer;

impl TreeWalker<CSResource, CSConfig> for SplashPhotoReplacer {
    fn describe(&self) -> String {
        "SplashPhotoReplacer".to_string()
    }

    fn matches(&self, tag_name: &str, _attrs: &[(String, String)], _ctx: Context<'_, '_, CSResource, CSConfig>) -> bool {
        tag_name == "splash"
    }

    fn replace(&self, _tag_name: &str, attrs: Vec<(String, String)>, _children: Vec<Node>, ctx: Context<'_, '_, CSResource, CSConfig>) -> Result<Vec<Node>, ConfigurafoxError> {
        let photo = get_attr(&attrs, "photo").ok_or(ConfigurafoxError::Other("<splash> without photo set".to_string()))?;

        let mut res = vec![Node::new_element(
            "div",
            vec![("class", "img-container")],
            vec![
                Node::new_element(
                    "img",
                    vec![("src", &format!("@splash-{photo}"))],
                    vec![],
                ),
                Node::new_element(
                    "a",
                    vec![("class", "overlay"), ("href", &format!("@splash-fullres-{photo}")), ("title", "view full quality photo")],
                    vec![],
                ),
            ],
        )];


        walk(&mut res, &[Box::new(LinkReplacer)], ctx)?;

        Ok(res)
    }
}

struct BlogpostReplacer;


impl<R: Resource> TreeWalker<R, CSConfig> for BlogpostReplacer {
    fn describe(&self) -> String {
        "BlogpostReplacer".to_string()
    }

    fn matches(&self, element_name: &str, _attrs: &[(String, String)], _ctx: Context<'_, '_, R, CSConfig>) -> bool {
        element_name == "blogs" || element_name == "blogs-wip"
    }

    fn replace(&self, tag: &str, _attrs: Vec<(String, String)>, children: Vec<Node>, ctx: Context<'_, '_, R, CSConfig>) -> Result<Vec<Node>, ConfigurafoxError> {
        let mut nodes = vec![];

        match tag {
            "blogs" => {
                for post in &ctx.data.blogs {
                    let replacer = VariableReplacer(post.vars());

                    let mut template = children.clone();
                    walk(&mut template, &[Box::new(replacer)], ctx)?;
                    nodes.extend(template);
                }
            }
            "blogs-wip" => {
                for post in &ctx.data.blogs_wip {
                    let vars: std::collections::HashMap<String, String> = vec![
                        ("blog_title".to_string(), post.title.clone()),
                        ("blog_tagline".to_string(), post.tagline.clone()),
                    ].into_iter().collect();

                    let replacer = VariableReplacer(vars);

                    let mut template = children.clone();
                    walk(&mut template, &[Box::new(replacer)], ctx)?;
                    nodes.extend(template);
                }
            }
            _ => unreachable!()
        }

        Ok(nodes)
    }
}

struct Shortcodes;

impl<R: Resource, D> TreeWalker<R, D> for Shortcodes {
    fn describe(&self) -> String {
        "InfoBoxReplacer".to_string()
    }

    fn matches(&self, tag_name: &str, _attrs: &[(String, String)], _ctx: Context<'_, '_, R, D>) -> bool {
        tag_name == "infobox" || tag_name == "quote" || tag_name == "navbar"
    }

    fn replace(&self, tag_name: &str, _attrs: Vec<(String, String)>, children: Vec<Node>, _ctx: Context<'_, '_, R, D>) -> Result<Vec<Node>, ConfigurafoxError> {
        match tag_name {
            "infobox" => {
                let info_div = Node::new_element(
                    "div",
                    vec![("class", "infobox")],
                    children,
                );

                Ok(vec![info_div])
            }
            "quote" => {
                let quote_p = Node::new_element(
                    "p",
                    vec![("class", "quote")],
                    children,
                );

                Ok(vec![quote_p])
            }
            "navbar" => {
                let quote_p = Node::new_element(
                    "div",
                    vec![("class", "navbar")],
                    vec![Node::new_element(
                        "a",
                        vec![("href", "@html-index")],
                        vec![Node::Text("coral.shoes".to_string())],
                    )],
                );

                Ok(vec![quote_p])
            }
            _ => unreachable!()
        }
    }
}

struct Links;

impl<R: Resource> TreeWalker<R, CSConfig> for Links {
    fn describe(&self) -> String {
        "Links".to_string()
    }

    fn matches(&self, tag_name: &str, _attrs: &[(String, String)], _ctx: Context<'_, '_, R, CSConfig>) -> bool {
        tag_name == "links"
    }

    fn replace(&self, _tag_name: &str, attrs: Vec<(String, String)>, children: Vec<Node>, ctx: Context<'_, '_, R, CSConfig>) -> Result<Vec<Node>, ConfigurafoxError> {
        let links = match get_attr(&attrs, "type").as_deref() {
            Some("internal") => {
                ctx.data.internal_links.clone()
            }
            Some("external") => {
                ctx.data.external_links.clone()
            }
            Some("all") => {
                let mut links = ctx.data.internal_links.clone();
                links.extend_from_slice(&ctx.data.external_links);
                links
            }
            x => {
                return Err(ConfigurafoxError::Other(format!("Unknown <link> type: {x:?}")));
            }
        };

        let mut nodes = Vec::new();
        for link in links {
            let vars: std::collections::HashMap<String, String> = vec![
                ("link_title".to_string(), link.title.clone()),
                ("link_href".to_string(), link.href.clone()),
                ("link_desc".to_string(), link.desc.clone()),
            ].into_iter().collect();

            let replacer = VariableReplacer(vars);

            let mut template = children.clone();
            walk(&mut template, &[Box::new(replacer)], ctx)?;
            nodes.extend(template);
        }

        Ok(nodes)
    }
}

struct Albums;

impl<R: Resource> TreeWalker<R, CSConfig> for Albums {
    fn describe(&self) -> String {
        "Albums".to_string()
    }

    fn matches(&self, tag_name: &str, _attrs: &[(String, String)], _ctx: Context<'_, '_, R, CSConfig>) -> bool {
        tag_name == "albums"
    }

    fn replace(&self, _tag_name: &str, _attrs: Vec<(String, String)>, children: Vec<Node>, ctx: Context<'_, '_, R, CSConfig>) -> Result<Vec<Node>, ConfigurafoxError> {
        let mut albums: Vec<(String, PhotoAlbum)> = ctx.data.albums.clone().into_iter().collect();
        albums.sort_by_key(|(_id, album)| std::cmp::Reverse(album.date));

        let mut nodes = Vec::new();
        for (id, album) in albums {
            let Some(date) = album.date.date else {
                return Err(ConfigurafoxError::Other(format!("Album {id}'s only defines time, not date")));
            };

            let date = format!("{year}-{month}-{day}", year=date.year, month=date.month, day=date.day);

            let vars: std::collections::HashMap<String, String> = vec![
                ("album_id".to_string(), id.clone()),
                ("album_date".to_string(), date),
                ("album_name".to_string(), album.name.clone()),
            ].into_iter().collect();

            let replacer = VariableReplacer(vars);
            let photos = Photos(id, album);

            let mut template = children.clone();
            walk(&mut template, &[Box::new(replacer), Box::new(photos)], ctx)?;
            nodes.extend(template);
        }

        Ok(nodes)
    }
}

struct Photos(String, PhotoAlbum);

impl<R: Resource> TreeWalker<R, CSConfig> for Photos {
    fn describe(&self) -> String {
        format!("Photos(id={:?}, album.name={:?})", self.0, self.1)
    }

    fn matches(&self, tag_name: &str, _attrs: &[(String, String)], _ctx: Context<'_, '_, R, CSConfig>) -> bool {
        tag_name == "photos"
    }

    fn replace(&self, _tag_name: &str, _attrs: Vec<(String, String)>, _children: Vec<Node>, ctx: Context<'_, '_, R, CSConfig>) -> Result<Vec<Node>, ConfigurafoxError> {
        let mut nodes = Vec::new();

        for photo in &self.1.photos {
            let mut class = "photo".to_string();
            match photo.size {
                None => {},
                Some(PhotoSize::Double) => class.push_str(" size_double"),
                Some(PhotoSize::Triple) => class.push_str(" size_triple"),
                Some(PhotoSize::Tall) => class.push_str(" size_tall"),
            };

            let checkbox_id = format!("cb-{}-{}", self.0, photo.photo);

            let mut photo_node = vec![Node::new_element(
                "div",
                vec![("class", &class)],
                vec![
                    Node::new_element(
                        "input",
                        vec![("type", "checkbox"), ("id", &checkbox_id), ("class", "photo-cb")],
                        vec![],
                    ),
                    Node::new_element(
                        "label",
                        vec![("class", "small-hitbox"), ("for", &checkbox_id)],
                        vec![
                            Node::new_element(
                                "img",
                                vec![("src", &format!("@photo-{}-{}", self.0, photo.photo))],
                                vec![],
                            ),
                        ],
                    ),
                    Node::new_element(
                        "div",
                        vec![("class", "large-container")],
                        vec![
                            Node::new_element(
                                "div",
                                vec![("class", "large-container-inner")],
                                vec![
                                    Node::new_element(
                                        "label",
                                        vec![("class", "large-hitbox"), ("for", &checkbox_id)],
                                        vec![
                                            Node::new_element(
                                                "img",
                                                vec![("class", "photo-large"), ("src", &format!("@photo-fullres-{}-{}", self.0, photo.photo))],
                                                vec![],
                                            ),
                                            Node::new_element(
                                                "span",
                                                vec![],
                                                vec![Node::Text("close".to_string())],
                                            ),
                                        ],
                                    ),
                                    Node::new_element(
                                        "span",
                                        vec![("class", "photo-alt")],
                                        vec![Node::Text(photo.alt.clone())],
                                    ),
                                ],
                            ),
                        ],
                    ),
                    Node::new_element(
                        "span",
                        vec![("class", "photo-alt")],
                        vec![Node::Text(photo.alt.clone())],
                    ),
                ],
            )];

            walk(&mut photo_node, &[Box::new(LinkReplacer)], ctx)?;

            nodes.extend(photo_node)
        }

        Ok(nodes)
    }
}

#[derive(Debug)]
struct ImageCompressor {
    max_size: [u32; 2], // Image will be resized so the largest dimension doesn't exceed this, while retaining the same aspect ratio
    output_quality: u8, // JPEG output quality
    guess_format: bool,
}

impl<R: Resource> ResourceProcessor<R> for ImageCompressor {
    fn name(&self) -> String {
        format!("{self:?}")
    }

    fn process_resource(
        &self,
        source: &R,
        source_path: &Path,
        resources: &ResourceManager<R>
    ) -> Result<Vec<u8>, ConfigurafoxError> {
        match source.output_path().extension().and_then(|x| x.to_str()) {
            Some("jpeg") | Some("jpg") => {},
            Some(ext) => {
                warn!("Applying ImageCompressor to {} generates a Jpeg file, but the extension of the output file is specified as {ext} ({:?})", source.identifier(), source.output_path());
            }
            None => {
                warn!("Applying ImageCompressor to {} generates a Jpeg file, but no the output file has no extension ({:?})", source.identifier(), source.output_path());
            }
        }

        let mut image_reader = image::io::Reader::open(resources.absolute_path(source_path))?;
        if self.guess_format {
            image_reader = image_reader.with_guessed_format()?;
        }

        debug!("Trying to decode image at {source_path:?}");

        let image = match image_reader.decode() {
            Ok(image) => image,
            Err(e) => {
                return Err(ConfigurafoxError::Other(format!("Error reading {source_path:?}: {e:?}")));
            }
        };

        debug!("Got {}x{} image", image.width(), image.height());

        let resized = image.resize(
            self.max_size[0],
            self.max_size[1],
            image::imageops::FilterType::Triangle, // I can't tell a difference between the example images (except for NN), so just picked this arbitrarily
        );

        debug!("Resized to {}x{}", resized.width(), resized.height());

        let mut output_buffer = std::io::Cursor::new(Vec::new());
        if let Err(e) = resized.write_to(&mut output_buffer, image::ImageOutputFormat::Jpeg(self.output_quality)) {
            return Err(ConfigurafoxError::Other(format!("Error encoding {source_path:?}: {e:?}")));
        }

        debug!("Encoded to {} bytes", output_buffer.get_ref().len());

        Ok(output_buffer.into_inner())
    }
}
