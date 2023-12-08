FROM python:3.10

WORKDIR /usr/src/app/

COPY requirements.txt /usr/src/
RUN pip install -r /usr/src/requirements.txt

COPY . /usr/src/app
CMD [ "python", "server.py", "14080" ]
