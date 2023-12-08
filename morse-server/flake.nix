{
  description = "Morse server";

  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (sys:
      let pkgs = nixpkgs.legacyPackages.${sys};
          python = pkgs.python310.withPackages (ps: with ps; [
            aiohttp
            ipython
            dacite
            (pylsp-mypy.overrideAttrs (old: { doCheck = false; }))
          ]);
      in rec {
        packages.tychk = pkgs.writeScriptBin "tychk" "${python}/bin/mypy ${./.}";
        devShells.default = pkgs.mkShell {
          packages = [ python pkgs.websocat ];
        };
      }
    );
}
