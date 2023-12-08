from __future__ import annotations

from typing import Any, List, Optional, Type, NewType, Dict

from abc import ABC
from dataclasses import dataclass, asdict, field
from dacite import from_dict

ID = NewType("ID", str)

@dataclass
class Member:
    name: str
    freq: float
    join_timestamp: float

@dataclass
class State:
    members: Dict[ID, Member]
    tones: List[ID] # IDs that make tones at their own frquency

@dataclass
class Request(ABC):
    client_timestamp: float

    @staticmethod
    def from_json(json: Any) -> Request:
        if "ty" not in json:
            raise ValueError("No ty")
        ty = json["ty"]
        if not isinstance(ty, str):
            raise ValueError("ty is not str")

        del json["ty"]

        cls: Optional[Type] = None
        if ty == "Hello":
            cls = Hello
        if ty == "Press":
            cls = Press
        if ty == "Release":
            cls = Release

        if cls is None:
            raise ValueError("invalid ty")
        return from_dict(data_class=cls, data=json)

# Sets the data associated with a member
# If the member has already joined, this updates them
# If the member has not joined, this adds them
@dataclass
class Hello(Request):
    my_name: str
    my_freq: float


@dataclass
class Press(Request):
    pass

@dataclass
class Release(Request):
    pass


@dataclass(kw_only=True)
class Response(ABC):
    server_timestamp: Optional[float] = field(default=None)

    def to_json(self) -> Any:
        return {
            "ty": self.__class__.__name__,
            **asdict(self) # type: ignore
        }

@dataclass
class SetState(Response):
    state: State

@dataclass
class YouAre(Response):
    id: ID

if __name__ == "__main__":
    assert Request.from_json({"ty": "Hello", "my_name": "xen", "my_freq": 2137.0, "client_timestamp": 123}) \
        == Hello(my_name="xen", my_freq=2137.0, client_timestamp=123)

    assert SetState(state=State(members={ID("0"): Member(name="xen", freq=2137.0, join_timestamp=0)}, tones=[ID("0")]), server_timestamp=0).to_json() \
        == {"ty": "SetState", "state": {"members": {"0": {"name": "xen", "freq": 2137.0, "join_timestamp": 0}}, "tones": ["0"]}, "server_timestamp": 0.}

    assert YouAre(id=ID("10"), server_timestamp=0).to_json() \
        == {"ty": "YouAre", "id": "10", "server_timestamp": 0}

