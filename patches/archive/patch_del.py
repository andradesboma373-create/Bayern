import json

with open("local_database_cache.json", "r") as f:
    data = json.load(f)

if "test" in data.get("settings", {}):
    del data["settings"]["test"]

with open("local_database_cache.json", "w") as f:
    json.dump(data, f, indent=2)
