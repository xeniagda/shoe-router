FROM python:3.8

WORKDIR /usr/src/app/

COPY requirements.txt /usr/src/
RUN pip install -r /usr/src/requirements.txt

COPY . /usr/src/app
CMD [ "python", "server.py", "13080" ]
