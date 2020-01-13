const validate = require("./../index")
const input = require("./input.json")

const rules = {
  "my-integer": {
    "type": "integer"
  },
  "my-string": {
    "required": true,
    "type": ["string"]
  },
  "type": {
    "type": ["object"]
  },
  "extra-property": {},
  "some-array": {
    "required": true,
    "type": ["array"],
    "min": 1,
    "max": 10,
    "children": {
      "*": {
        "type": ["string"]
      }
    }
  },
  "some-object": {
    "required": true,
    "type": ["object"],
    "children": {
      "@": {
        "strict": false
      },
      "#": {
        "type": "string",
        "pattern": /^([a-z]+)$/,
      },
      "*": {
        "type": "object",
        "children": {
          "color": {
            "required": true,
            "type": "string"
          },
          "type": {
            "required": true,
            "in": ["fruit", "vegetable"]
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