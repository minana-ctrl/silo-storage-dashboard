Query usage for a project v2

# Query usage for a project v2

Query usage for a project

## 📊 Analytics API Overview

With the Analytics API, you can retrieve the usage data of your conversational assistant. This data can be used to understand how your assistant is being used, such as the number of conversations started, messages sent, and unique users. This information can be valuable for:

* Assessing the performance and effectiveness of your assistant
* Identifying areas for improvement
* Making data-driven decisions about its development and deployment

<br />

## 📋 Request Types

There are different types of requests that can be sent.
To see a list of all request types, check out the documentation for the `data.name` field below.

Examples include:

* Top intents (`top_intents`)
* Total interactions (`interactions`)
* Unique users (`unique_users`)
* Credits usage (`credit_usage`)

<br />

### 📑 Pagination Description

The API response supports pagination to efficiently manage and navigate through large sets of data.

* **cursor**:
  An opaque integer or string token representing the current position in the overall dataset. This cursor can be used in subsequent API requests to fetch the next page of results. For example, when requesting the next page, the client includes this cursor to continue retrieving items after the current batch.
* **items**:

  An array containing the current page of data objects. Each item represents a record with its respective details such as period, projectID, environmentID, and other related fields.

<details>
  <summary>How Pagination Works</summary>

  <ul>
    <li><strong>Initial Request:</strong>
    The client makes a request without a cursor or with a starting cursor value. The server returns a subset of the dataset (a "page") along with a cursor pointing to the next page.</li>
    <li><strong>Subsequent Requests:</strong>
    To retrieve the next page, the client sends a new request including the <code>cursor</code> value from the previous response. The server responds with the next subset of items and an updated cursor.</li>
    <li><strong>End of Data:</strong>
    When the client reaches the end of the dataset, the server may return an empty <code>items</code> array or omit the <code>cursor</code> value, indicating no further data is available.</li>
  </ul>

  <h4>Example Fields:</h4>

  <ul>
    <li><code>cursor: 2106</code> — Current pagination token indicating the position for the next data fetch.</li>
    <li><code>items</code> — List of data entries corresponding to the current page.</li>
  </ul>
</details>

### 📘 Example Request and Response

```json Top intents
// REQUEST body 

{
  "data": {
    "name": "top_intents",
    "filter": {
      "projectID": "62912f08e83f76001b218690",
      "startTime": "2021-08-01T00:00:00.000Z",
      "endTime": "2021-08-16T00:00:00.000Z",
      "limit": 3
    }
  }
}

// ------------------------------------------

// RESPONSE body

{
  "result": {
    "intents": [
      {
        "name": "info_personal",
        "count": 152
      },
      {
        "name": "info_company",
        "count": 101
      },
      {
        "name": "info_name",
        "count": 80
      }
    ]
  }
}
```

```json Total Interactions
// REQUEST body 

{
  "data": {
    "name": "interactions",
    "filter": {
      "projectID": "62912f08e83f76001b218690",
      "startTime": "2021-08-01T00:00:00.000Z",
      "limit": 3
    }
  }
}

// ------------------------------------------

// RESPONSE body

{
  "result": {
    "cursor": 296,
    "items": [
      {
        "period": "2025-06-13T18:00:00.000Z",
        "projectID": "62912f08e83f76001b218690",
        "environmentID": "684c6d43ea3aff06439c1561",
        "type": "canvas-prototype",
        "count": 18
      },
      {
        "period": "2025-07-16T23:00:00.000Z",
        "projectID": "62912f08e83f76001b218690",
        "environmentID": "684c6d43ea3aff06439c1561",
        "type": "dialog-management",
        "count": 6
      },
      {
        "period": "2025-07-16T17:00:00.000Z",
        "projectID": "62912f08e83f76001b218690",
        "environmentID": "684c6d43ea3aff06439c1561",
        "type": "dialog-management",
        "count": 4
      }
    ]
  }
}
```

```json Unique users
// REQUEST body 

{
  "data": {
    "name": "unique_users",
    "filter": {
      "projectID": "62912f08e83f76001b218690",
      "startTime": "2021-08-01T00:00:00.000Z",
      "limit": 3
    }
  }
}

// ------------------------------------------

// RESPONSE body

{
  "result": {
    "cursor": 143,
    "items": [
      {
        "period": "2025-06-13T18:00:00.000Z",
        "projectID": "62912f08e83f76001b218690",
        "environmentID": "684c6d43ea3aff06439c1561",
        "count": 6
      },
      {
        "period": "2025-07-16T23:00:00.000Z",
        "projectID": "62912f08e83f76001b218690",
        "environmentID": "684c6d43ea3aff06439c1561",
        "count": 1
      },
      {
        "period": "2025-07-16T17:00:00.000Z",
        "projectID": "62912f08e83f76001b218690",
        "environmentID": "684c6d43ea3aff06439c1561",
        "count": 1
      }
    ]
  }
}
```

```json Credits usage
// REQUEST body 

{
  "data": {
    "name": "credit_usage",
    "filter": {
      "projectID": "62912f08e83f76001b218690",
      "startTime": "2021-08-01T00:00:00.000Z",
      "limit": 3
    }
  }
}

// ------------------------------------------

// RESPONSE body

{
  "result": {
    "cursor": 2106,
    "items": [
      {
        "period": "2025-06-27T07:00:00.000Z",
        "projectID": "62912f08e83f76001b218690",
        "environmentID": "685e43867fff32e515fcac92",
        "diagramID": "64dbb6696a8fab0013dba194",
        "nodeID": "67db2b51c6c175f16d898090",
        "model": "claude-3.7-sonnet",
        "type": "llm-input",
        "count": 13201
      },
      {
        "period": "2025-06-27T07:00:00.000Z",
        "projectID": "62912f08e83f76001b218690",
        "environmentID": "685e43867fff32e515fcac92",
        "diagramID": "64dbb6696a8fab0013dba194",
        "nodeID": "67db2b51c6c175f16d898090",
        "model": "claude-3.7-sonnet",
        "type": "llm-output",
        "count": 308
      },
      {
        "period": "2025-06-28T03:00:00.000Z",
        "projectID": "62912f08e83f76001b218690",
        "environmentID": "685e43867fff32e515fcac92",
        "diagramID": "",
        "nodeID": "",
        "model": "gpt-4o-mini",
        "type": "llm-input",
        "count": 438
      }
    ]
  }
}

```

```json Functions usage
// REQUEST body 

{
  "data": {
    "name": "function_usage",
    "filter": {
      "projectID": "62912f08e83f76001b218690",
      "startTime": "2021-08-01T00:00:00.000Z",
      "limit": 3
    }
  }
}

// ------------------------------------------

// RESPONSE body

{
  "result": {
    "cursor": 2106,
    "items": [
      {
        "period": "2025-07-16T06:00:00.000Z",
        "projectID": "62912f08e83f76001b218690",
        "count": 1,
        "successCount": 1,
        "functionID": "683e1c27abe040bae572744b",
        "environmentID": "685e43867fff32e515fcac92",
        "name": "Get joke"
      },
      {
        "period": "2025-07-24T22:00:00.000Z",
        "projectID": "62912f08e83f76001b218690",
        "count": 2,
        "successCount": 2,
        "functionID": "683e1c27abe040bae572744b",
        "environmentID": "685e43867fff32e515fcac92",
        "name": "Get joke"
      }
    ]
  }
}

```

```json API calls
// REQUEST body 

{
  "data": {
    "name": "api_calls",
    "filter": {
      "projectID": "62912f08e83f76001b218690",
      "startTime": "2021-08-01T00:00:00.000Z",
      "limit": 3
    }
  }
}

// ------------------------------------------

// RESPONSE body

{
  "result": {
    "cursor": 2106,
    "items": [
      {
        "period": "2025-06-27T14:00:00.000Z",
        "projectID": "62912f08e83f76001b218690",
        "count": 1,
        "successCount": 1,
        "apiToolID": "683e1a51abe040bae57273eb",
        "environmentID": "685e43867fff32e515fcac92",
        "name": "Get weather"
      },
      {
        "period": "2025-07-16T06:00:00.000Z",
        "projectID": "62912f08e83f76001b218690",
        "count": 2,
        "successCount": 2,
        "apiToolID": "683e1a51abe040bae57273eb",
        "environmentID": "685e43867fff32e515fcac92",
        "name": "Get weather"
      }
    ]
  }
}

```

```json KB documents
// REQUEST body 

{
  "data": {
    "name": "kb_documents",
    "filter": {
      "projectID": "62912f08e83f76001b218690",
      "startTime": "2021-08-01T00:00:00.000Z",
      "limit": 3
    }
  }
}

// ------------------------------------------

// RESPONSE body

{
  "result": {
    "cursor": 2106,
    "items": [
      {
        "period": "2025-06-14T01:00:00.000Z",
        "projectID": "62912f08e83f76001b218690",
        "environmentID": "684c6d43ea3aff06439c1561",
        "count": 6,
        "documentID": "684c6d57eca71686851dd2e3"
      },
      {
        "period": "2025-06-14T01:00:00.000Z",
        "projectID": "62912f08e83f76001b218690",
        "environmentID": "684c6d43ea3aff06439c1561",
        "count": 6,
        "documentID": "684c6d57eca71686851dd2e1"
      },
      {
        "period": "2025-06-14T01:00:00.000Z",
        "projectID": "62912f08e83f76001b218690",
        "environmentID": "684c6d43ea3aff06439c1561",
        "count": 2,
        "documentID": "684c6d57eca71686851dd2e2"
      }
    ]
  }
}

```

```json Integrations
// REQUEST body 

{
  "data": {
    "name": "integrations",
    "filter": {
      "projectID": "62912f08e83f76001b218690",
      "startTime": "2021-08-01T00:00:00.000Z",
      "limit": 3
    }
  }
}

// ------------------------------------------

// RESPONSE body

{
  "result": {
    "cursor": 2106,
    "items": [
      {
        "period": "2025-06-27T14:00:00.000Z",
        "projectID": "62912f08e83f76001b218690",
        "count": 1,
        "successCount": 1,
        "integrationToolName": "google_sheets_read_spreadsheet",
        "environmentID": "685e43867fff32e515fcac92",
      },
      {
        "period": "2025-07-16T06:00:00.000Z",
        "projectID": "62912f08e83f76001b218690",
        "count": 2,
        "successCount": 2,
        "integrationToolName": "google_sheets_append_spreadsheet",
        "environmentID": "685e43867fff32e515fcac92",
      }
    ]
  }
}

```

### `Period` field

Specifies the timestamp representing the start of the time interval for which the data item is relevant. This field indicates the exact period or time window associated with the recorded data, typically in UTC

# OpenAPI definition

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Analytics API",
    "description": "Voiceflow analytics service",
    "version": "1.0.0",
    "contact": {}
  },
  "paths": {
    "/v2/query/usage": {
      "post": {
        "operationId": "QueryPublicController_queryUsageV2",
        "summary": "Query usage for a project v2",
        "description": "Query usage for a project",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "data": {
                    "type": "object",
                    "properties": {
                      "name": {
                        "type": "string",
                        "enum": [
                          "interactions",
                          "top_intents",
                          "unique_users",
                          "credit_usage",
                          "function_usage",
                          "api_calls",
                          "kb_documents",
                          "integrations"
                        ],
                        "description": "The type of usage data to query"
                      },
                      "filter": {
                        "description": "A base filter supported by all queries that return a list",
                        "type": "object",
                        "properties": {
                          "projectID": {
                            "type": "string",
                            "minLength": 1,
                            "description": "The `projectID` of your assistant.  You can find this value in your assistant's **Settings** page.  Example: `62912f08e83f76001b218690`",
                            "default": "62912f08e83f76001b218690"
                          },
                          "startTime": {
                            "description": "A timestamp in ISO-8601 format",
                            "type": "string"
                          },
                          "endTime": {
                            "description": "A timestamp in ISO-8601 format",
                            "type": "string"
                          },
                          "limit": {
                            "type": "integer",
                            "minimum": 1,
                            "maximum": 500,
                            "default": 100
                          },
                          "cursor": {
                            "type": "number"
                          }
                        },
                        "required": [
                          "projectID"
                        ],
                        "x-readme-ref-name": "BaseFilter"
                      }
                    },
                    "required": [
                      "name",
                      "filter"
                    ]
                  }
                },
                "required": [
                  "data"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "The query succeed and the result was returned",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "result": {
                      "oneOf": [
                        {
                          "type": "object",
                          "properties": {
                            "cursor": {
                              "type": "integer"
                            },
                            "items": {
                              "type": "array",
                              "items": {
                                "type": "object",
                                "properties": {
                                  "period": {
                                    "type": "string",
                                    "format": "date-time"
                                  },
                                  "projectID": {
                                    "type": "string"
                                  },
                                  "environmentID": {
                                    "type": "string"
                                  },
                                  "count": {
                                    "type": "integer"
                                  },
                                  "type": {
                                    "type": "string"
                                  }
                                },
                                "required": [
                                  "period",
                                  "projectID",
                                  "environmentID",
                                  "count",
                                  "type"
                                ]
                              }
                            }
                          },
                          "required": [
                            "items"
                          ]
                        },
                        {
                          "type": "object",
                          "properties": {
                            "intents": {
                              "type": "array",
                              "items": {
                                "type": "object",
                                "properties": {
                                  "name": {
                                    "description": "The name of the intent",
                                    "type": "string"
                                  },
                                  "count": {
                                    "description": "The number of times the intent was used in the project(s) that matched the provided filter",
                                    "type": "integer",
                                    "minimum": 0,
                                    "exclusiveMinimum": false
                                  }
                                },
                                "required": [
                                  "name",
                                  "count"
                                ]
                              }
                            }
                          },
                          "required": [
                            "intents"
                          ]
                        },
                        {
                          "type": "object",
                          "properties": {
                            "cursor": {
                              "type": "integer"
                            },
                            "items": {
                              "type": "array",
                              "items": {
                                "type": "object",
                                "properties": {
                                  "period": {
                                    "type": "string",
                                    "format": "date-time"
                                  },
                                  "projectID": {
                                    "type": "string"
                                  },
                                  "environmentID": {
                                    "type": "string"
                                  },
                                  "count": {
                                    "type": "integer"
                                  }
                                },
                                "required": [
                                  "period",
                                  "projectID",
                                  "environmentID",
                                  "count"
                                ]
                              }
                            }
                          },
                          "required": [
                            "items"
                          ]
                        },
                        {
                          "type": "object",
                          "properties": {
                            "cursor": {
                              "type": "integer"
                            },
                            "items": {
                              "type": "array",
                              "items": {
                                "type": "object",
                                "properties": {
                                  "period": {
                                    "type": "string",
                                    "format": "date-time"
                                  },
                                  "projectID": {
                                    "type": "string"
                                  },
                                  "environmentID": {
                                    "type": "string"
                                  },
                                  "count": {
                                    "type": "integer"
                                  },
                                  "diagramID": {
                                    "type": "string"
                                  },
                                  "nodeID": {
                                    "type": "string"
                                  },
                                  "model": {
                                    "type": "string"
                                  },
                                  "type": {
                                    "type": "string"
                                  }
                                },
                                "required": [
                                  "period",
                                  "projectID",
                                  "environmentID",
                                  "count",
                                  "diagramID",
                                  "nodeID",
                                  "model",
                                  "type"
                                ]
                              }
                            }
                          },
                          "required": [
                            "items"
                          ]
                        },
                        {
                          "type": "object",
                          "properties": {
                            "cursor": {
                              "type": "integer"
                            },
                            "items": {
                              "type": "array",
                              "items": {
                                "type": "object",
                                "properties": {
                                  "period": {
                                    "type": "string",
                                    "format": "date-time"
                                  },
                                  "projectID": {
                                    "type": "string"
                                  },
                                  "environmentID": {
                                    "type": "string"
                                  },
                                  "count": {
                                    "type": "integer"
                                  },
                                  "functionID": {
                                    "type": "string"
                                  },
                                  "name": {
                                    "type": "string"
                                  },
                                  "successCount": {
                                    "type": "integer"
                                  }
                                },
                                "required": [
                                  "period",
                                  "projectID",
                                  "environmentID",
                                  "count",
                                  "functionID",
                                  "name",
                                  "successCount"
                                ]
                              }
                            }
                          },
                          "required": [
                            "items"
                          ]
                        },
                        {
                          "type": "object",
                          "properties": {
                            "cursor": {
                              "type": "integer"
                            },
                            "items": {
                              "type": "array",
                              "items": {
                                "type": "object",
                                "properties": {
                                  "period": {
                                    "type": "string",
                                    "format": "date-time"
                                  },
                                  "projectID": {
                                    "type": "string"
                                  },
                                  "environmentID": {
                                    "type": "string"
                                  },
                                  "count": {
                                    "type": "integer"
                                  },
                                  "apiToolID": {
                                    "type": "string"
                                  },
                                  "name": {
                                    "type": "string"
                                  },
                                  "successCount": {
                                    "type": "integer"
                                  }
                                },
                                "required": [
                                  "period",
                                  "projectID",
                                  "environmentID",
                                  "count",
                                  "apiToolID",
                                  "name",
                                  "successCount"
                                ]
                              }
                            }
                          },
                          "required": [
                            "items"
                          ]
                        },
                        {
                          "type": "object",
                          "properties": {
                            "cursor": {
                              "type": "integer"
                            },
                            "items": {
                              "type": "array",
                              "items": {
                                "type": "object",
                                "properties": {
                                  "period": {
                                    "type": "string",
                                    "format": "date-time"
                                  },
                                  "projectID": {
                                    "type": "string"
                                  },
                                  "environmentID": {
                                    "type": "string"
                                  },
                                  "count": {
                                    "type": "integer"
                                  },
                                  "documentID": {
                                    "type": "string"
                                  }
                                },
                                "required": [
                                  "period",
                                  "projectID",
                                  "environmentID",
                                  "count",
                                  "documentID"
                                ]
                              }
                            }
                          },
                          "required": [
                            "items"
                          ]
                        },
                        {
                          "type": "object",
                          "properties": {
                            "cursor": {
                              "type": "integer"
                            },
                            "items": {
                              "type": "array",
                              "items": {
                                "type": "object",
                                "properties": {
                                  "period": {
                                    "type": "string",
                                    "format": "date-time"
                                  },
                                  "projectID": {
                                    "type": "string"
                                  },
                                  "environmentID": {
                                    "type": "string"
                                  },
                                  "count": {
                                    "type": "integer"
                                  },
                                  "integrationToolName": {
                                    "type": "string"
                                  },
                                  "successCount": {
                                    "type": "integer"
                                  }
                                },
                                "required": [
                                  "period",
                                  "projectID",
                                  "environmentID",
                                  "count",
                                  "integrationToolName",
                                  "successCount"
                                ]
                              }
                            }
                          },
                          "required": [
                            "items"
                          ]
                        }
                      ]
                    }
                  },
                  "required": [
                    "result"
                  ]
                }
              }
            }
          },
          "401": {
            "description": "The provided authentication token does not have permissions for some of the requested resources"
          }
        },
        "tags": [
          "Query",
          "Public-Docs",
          "Usage"
        ],
        "security": [
          {
            "auth": []
          }
        ]
      }
    }
  },
  "servers": [
    {
      "url": "https://analytics-api.voiceflow.com"
    }
  ],
  "components": {
    "securitySchemes": {
      "auth": {
        "type": "apiKey",
        "in": "header",
        "name": "authorization",
        "description": "Voiceflow Dialog Manager API key (VF.DM)"
      }
    }
  },
  "x-readme": {
    "explorer-enabled": true,
    "proxy-enabled": true,
    "samples-enabled": true
  }
}
```

# OpenAPI definition
```json
{
  "_id": "/branches/2.0/apis/analytics-api-usage-v2.json",
  "openapi": "3.1.0",
  "info": {
    "title": "Analytics API",
    "description": "Voiceflow analytics service",
    "version": "1.0.0",
    "contact": {}
  },
  "paths": {
    "/v2/query/usage": {
      "post": {
        "operationId": "QueryPublicController_queryUsageV2",
        "summary": "Query usage for a project v2",
        "description": "Query usage for a project",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "data": {
                    "type": "object",
                    "properties": {
                      "name": {
                        "type": "string",
                        "enum": [
                          "interactions",
                          "top_intents",
                          "unique_users",
                          "credit_usage",
                          "function_usage",
                          "api_calls",
                          "kb_documents",
                          "integrations"
                        ],
                        "description": "The type of usage data to query"
                      },
                      "filter": {
                        "description": "A base filter supported by all queries that return a list",
                        "type": "object",
                        "properties": {
                          "projectID": {
                            "type": "string",
                            "minLength": 1,
                            "description": "The `projectID` of your assistant.  You can find this value in your assistant's **Settings** page.  Example: `62912f08e83f76001b218690`",
                            "default": "62912f08e83f76001b218690"
                          },
                          "startTime": {
                            "description": "A timestamp in ISO-8601 format",
                            "type": "string"
                          },
                          "endTime": {
                            "description": "A timestamp in ISO-8601 format",
                            "type": "string"
                          },
                          "limit": {
                            "type": "integer",
                            "minimum": 1,
                            "maximum": 500,
                            "default": 100
                          },
                          "cursor": {
                            "type": "number"
                          }
                        },
                        "required": [
                          "projectID"
                        ],
                        "x-readme-ref-name": "BaseFilter"
                      }
                    },
                    "required": [
                      "name",
                      "filter"
                    ]
                  }
                },
                "required": [
                  "data"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "The query succeed and the result was returned",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "result": {
                      "oneOf": [
                        {
                          "type": "object",
                          "properties": {
                            "cursor": {
                              "type": "integer"
                            },
                            "items": {
                              "type": "array",
                              "items": {
                                "type": "object",
                                "properties": {
                                  "period": {
                                    "type": "string",
                                    "format": "date-time"
                                  },
                                  "projectID": {
                                    "type": "string"
                                  },
                                  "environmentID": {
                                    "type": "string"
                                  },
                                  "count": {
                                    "type": "integer"
                                  },
                                  "type": {
                                    "type": "string"
                                  }
                                },
                                "required": [
                                  "period",
                                  "projectID",
                                  "environmentID",
                                  "count",
                                  "type"
                                ]
                              }
                            }
                          },
                          "required": [
                            "items"
                          ]
                        },
                        {
                          "type": "object",
                          "properties": {
                            "intents": {
                              "type": "array",
                              "items": {
                                "type": "object",
                                "properties": {
                                  "name": {
                                    "description": "The name of the intent",
                                    "type": "string"
                                  },
                                  "count": {
                                    "description": "The number of times the intent was used in the project(s) that matched the provided filter",
                                    "type": "integer",
                                    "minimum": 0,
                                    "exclusiveMinimum": false
                                  }
                                },
                                "required": [
                                  "name",
                                  "count"
                                ]
                              }
                            }
                          },
                          "required": [
                            "intents"
                          ]
                        },
                        {
                          "type": "object",
                          "properties": {
                            "cursor": {
                              "type": "integer"
                            },
                            "items": {
                              "type": "array",
                              "items": {
                                "type": "object",
                                "properties": {
                                  "period": {
                                    "type": "string",
                                    "format": "date-time"
                                  },
                                  "projectID": {
                                    "type": "string"
                                  },
                                  "environmentID": {
                                    "type": "string"
                                  },
                                  "count": {
                                    "type": "integer"
                                  }
                                },
                                "required": [
                                  "period",
                                  "projectID",
                                  "environmentID",
                                  "count"
                                ]
                              }
                            }
                          },
                          "required": [
                            "items"
                          ]
                        },
                        {
                          "type": "object",
                          "properties": {
                            "cursor": {
                              "type": "integer"
                            },
                            "items": {
                              "type": "array",
                              "items": {
                                "type": "object",
                                "properties": {
                                  "period": {
                                    "type": "string",
                                    "format": "date-time"
                                  },
                                  "projectID": {
                                    "type": "string"
                                  },
                                  "environmentID": {
                                    "type": "string"
                                  },
                                  "count": {
                                    "type": "integer"
                                  },
                                  "diagramID": {
                                    "type": "string"
                                  },
                                  "nodeID": {
                                    "type": "string"
                                  },
                                  "model": {
                                    "type": "string"
                                  },
                                  "type": {
                                    "type": "string"
                                  }
                                },
                                "required": [
                                  "period",
                                  "projectID",
                                  "environmentID",
                                  "count",
                                  "diagramID",
                                  "nodeID",
                                  "model",
                                  "type"
                                ]
                              }
                            }
                          },
                          "required": [
                            "items"
                          ]
                        },
                        {
                          "type": "object",
                          "properties": {
                            "cursor": {
                              "type": "integer"
                            },
                            "items": {
                              "type": "array",
                              "items": {
                                "type": "object",
                                "properties": {
                                  "period": {
                                    "type": "string",
                                    "format": "date-time"
                                  },
                                  "projectID": {
                                    "type": "string"
                                  },
                                  "environmentID": {
                                    "type": "string"
                                  },
                                  "count": {
                                    "type": "integer"
                                  },
                                  "functionID": {
                                    "type": "string"
                                  },
                                  "name": {
                                    "type": "string"
                                  },
                                  "successCount": {
                                    "type": "integer"
                                  }
                                },
                                "required": [
                                  "period",
                                  "projectID",
                                  "environmentID",
                                  "count",
                                  "functionID",
                                  "name",
                                  "successCount"
                                ]
                              }
                            }
                          },
                          "required": [
                            "items"
                          ]
                        },
                        {
                          "type": "object",
                          "properties": {
                            "cursor": {
                              "type": "integer"
                            },
                            "items": {
                              "type": "array",
                              "items": {
                                "type": "object",
                                "properties": {
                                  "period": {
                                    "type": "string",
                                    "format": "date-time"
                                  },
                                  "projectID": {
                                    "type": "string"
                                  },
                                  "environmentID": {
                                    "type": "string"
                                  },
                                  "count": {
                                    "type": "integer"
                                  },
                                  "apiToolID": {
                                    "type": "string"
                                  },
                                  "name": {
                                    "type": "string"
                                  },
                                  "successCount": {
                                    "type": "integer"
                                  }
                                },
                                "required": [
                                  "period",
                                  "projectID",
                                  "environmentID",
                                  "count",
                                  "apiToolID",
                                  "name",
                                  "successCount"
                                ]
                              }
                            }
                          },
                          "required": [
                            "items"
                          ]
                        },
                        {
                          "type": "object",
                          "properties": {
                            "cursor": {
                              "type": "integer"
                            },
                            "items": {
                              "type": "array",
                              "items": {
                                "type": "object",
                                "properties": {
                                  "period": {
                                    "type": "string",
                                    "format": "date-time"
                                  },
                                  "projectID": {
                                    "type": "string"
                                  },
                                  "environmentID": {
                                    "type": "string"
                                  },
                                  "count": {
                                    "type": "integer"
                                  },
                                  "documentID": {
                                    "type": "string"
                                  }
                                },
                                "required": [
                                  "period",
                                  "projectID",
                                  "environmentID",
                                  "count",
                                  "documentID"
                                ]
                              }
                            }
                          },
                          "required": [
                            "items"
                          ]
                        },
                        {
                          "type": "object",
                          "properties": {
                            "cursor": {
                              "type": "integer"
                            },
                            "items": {
                              "type": "array",
                              "items": {
                                "type": "object",
                                "properties": {
                                  "period": {
                                    "type": "string",
                                    "format": "date-time"
                                  },
                                  "projectID": {
                                    "type": "string"
                                  },
                                  "environmentID": {
                                    "type": "string"
                                  },
                                  "count": {
                                    "type": "integer"
                                  },
                                  "integrationToolName": {
                                    "type": "string"
                                  },
                                  "successCount": {
                                    "type": "integer"
                                  }
                                },
                                "required": [
                                  "period",
                                  "projectID",
                                  "environmentID",
                                  "count",
                                  "integrationToolName",
                                  "successCount"
                                ]
                              }
                            }
                          },
                          "required": [
                            "items"
                          ]
                        }
                      ]
                    }
                  },
                  "required": [
                    "result"
                  ]
                }
              }
            }
          },
          "401": {
            "description": "The provided authentication token does not have permissions for some of the requested resources"
          }
        },
        "tags": [
          "Query",
          "Public-Docs",
          "Usage"
        ],
        "security": [
          {
            "auth": []
          }
        ]
      }
    }
  },
  "servers": [
    {
      "url": "https://analytics-api.voiceflow.com"
    }
  ],
  "components": {
    "securitySchemes": {
      "auth": {
        "type": "apiKey",
        "in": "header",
        "name": "authorization",
        "description": "Voiceflow Dialog Manager API key (VF.DM)"
      }
    }
  },
  "x-readme": {
    "explorer-enabled": true,
    "proxy-enabled": true,
    "samples-enabled": true
  }
}
```