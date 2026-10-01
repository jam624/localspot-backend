import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Localspot API",
      version: "1.0.0",
      description: "API documentation for the Localspot backend.",
    },
    servers: [{ url: "/api/v1", description: "API v1" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Error message details",
            },
          },
        },
        ValidationErrorResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Validation failed",
            },
            field: {
              type: "string",
              example: "email",
            },
            errors: {
              type: "array",
              items: { type: "string" },
              example: ["email is required"],
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: "Authentication is required or the token is invalid.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        Forbidden: {
          description: "Access forbidden — insufficient permissions.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        NotFound: {
          description: "The requested resource was not found.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        ValidationError: {
          description: "The request contains invalid input.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ValidationErrorResponse" },
            },
          },
        },
      },
    },
  },
  apis: ["./app.js", "./modules/**/*.routes.js", "./modules/**/*.route.js"],
};

export default swaggerJSDoc(options);
