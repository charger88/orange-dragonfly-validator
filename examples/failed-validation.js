const validate = require("./../index")
const input = require("./input.json")

const rules = {
  "my-integer": {
    "type": "array"
  },
  "can-be-null": {
    "type": ["null"]
  },
  "my-string": {
    "type": "integer"
  },
  "type": {
    "type": "array"
  },
  "missing-property": {
    "required": true,
    "type": "integer"
  },
  "some-array": {
    "required": true,
    "type": "array",
    "min": 10,
    "max": 1,
    "children": {
      "*": {
        "type": "integer"
      }
    }
  },
  "some-object": {
    "required": true,
    "type": "object",
    "children": {
      "#": {
        "type": "string",
        "pattern": /^([A-Z]+)$/,
      },
      "*": {
        "type": "object",
        "children": {
          "color": {
            "type": "integer"
          },
          "type": {
            "in": ["tree", "vegetable", "possum"],
            "in:public": ["tree", "vegetable"]
          }
        }
      }
    }
  },
};

try {
  validate(rules, input)
  console.log("Validation passed")
} catch (e) {
  console.error("Validation failed", e.message, e.info)
}