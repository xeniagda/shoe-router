FROM python:3.8
WORKDIR /usr/src/app/
COPY requirements.txt /usr/src/
RUN apt-get update

RUN pip install -r /usr/src/requirements.txt
CMD [ "python", "api.py" ]
