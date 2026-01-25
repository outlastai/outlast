# Create Validated Function

Create a new function using the validation and error handling pattern with Zod schemas.

## Pattern Overview

This pattern uses a builder-style approach:

1. **Outer function** (`createXxx`) accepts dependencies as parameters (dependency injection)
2. **Inner function** (`fn`) contains the actual business logic with typed parameters
3. **Wrapper** (`withErrorHandlingAndValidation`) handles validation and errors

This design enables **dependency injection**, making functions easy to test by swapping real dependencies with mocks.

## Instructions

1. **Identify or create the Zod schema** in `@outlast/common`:
   - Check if a schema already exists in `mods/common/src/schemas/`
   - If not, create a new schema file following the naming convention: `<domain>.ts`
   - Export the schema and its inferred type from `mods/common/src/schemas/index.ts`
   - Export from `mods/common/src/index.ts`

2. **Use existing client interfaces** from `@outlast/common`:
   - Client interfaces live in `mods/common/src/types/`
   - Import them: `import type { DbClient } from "@outlast/common"`
   - If a new interface is needed, add it to the types folder

3. **Create the function file** following the naming pattern `create<FunctionName>.ts`:

   ```typescript
   import {
     withErrorHandlingAndValidation,
     <schemaName>,
     type <InputType>,
     type DbClient,
   } from "@outlast/common";

   export function create<FunctionName>(client: DbClient) {
     const fn = async (params: <InputType>) => {
       // Business logic here using the injected client
       return client.doSomething(params);
     };

     return withErrorHandlingAndValidation(fn, <schemaName>);
   }
   ```

4. **Export the function** from the appropriate barrel file or index

## Example: Record Operations

### Using Shared Types

```typescript
import {
  withErrorHandlingAndValidation,
  createRecordSchema,
  type CreateRecordInput,
  type DbClient
} from "@outlast/common";

export function createCreateRecord(client: DbClient) {
  const fn = async (params: CreateRecordInput) => {
    return client.record.create({ data: params });
  };

  return withErrorHandlingAndValidation(fn, createRecordSchema);
}
```

### Production Usage

```typescript
import { db } from "./db.js";
import { createCreateRecord } from "./api/records/createCreateRecord.js";

// Inject the real database client
const createRecord = createCreateRecord(db);

// This will validate input and throw ValidationError if invalid
const record = await createRecord({
  title: "My Record"
});
```

## Dependency Injection for Testing

The builder pattern enables easy testing by injecting mock clients instead of real ones.

### Test Example (Mocha + Sinon)

```typescript
import { expect } from "chai";
import sinon from "sinon";
import { createCreateRecord } from "./createCreateRecord.js";
import { ValidationError } from "@outlast/common";

describe("createCreateRecord", () => {
  const validInput = {
    title: "Test Record"
  };

  describe("with valid input", () => {
    it("should create a record", async () => {
      // Arrange
      const expectedRecord = { id: "123", ...validInput };
      const mockClient = {
        record: {
          create: sinon.stub().resolves(expectedRecord)
        }
      };
      const createRecord = createCreateRecord(mockClient);

      // Act
      const result = await createRecord(validInput);

      // Assert
      expect(result.id).to.equal("123");
      expect(mockClient.record.create.calledOnce).to.be.true;
      expect(mockClient.record.create.calledWith({ data: validInput })).to.be.true;
    });
  });

  describe("with invalid input", () => {
    it("should throw ValidationError for missing required fields", async () => {
      // Arrange
      const mockClient = {
        record: {
          create: sinon.stub()
        }
      };
      const createRecord = createCreateRecord(mockClient);

      // Act & Assert
      try {
        await createRecord({ title: "" });
        expect.fail("Expected ValidationError to be thrown");
      } catch (error) {
        expect(error).to.be.instanceOf(ValidationError);
        expect(mockClient.record.create.called).to.be.false;
      }
    });
  });
});
```

### Benefits of This Pattern

1. **Testability**: Swap real clients with mocks - no external services needed for unit tests
2. **Isolation**: Test business logic separately from infrastructure
3. **Fast tests**: Mock clients return instantly, no I/O overhead
4. **Predictable**: Control exactly what the client returns or throws
5. **Validation coverage**: Verify invalid input never reaches the client

## Error Handling

The `withErrorHandlingAndValidation` wrapper:

- Validates input against the Zod schema using `safeParse`
- Throws `ValidationError` with detailed field-level errors if validation fails
- Passes validated, typed data to the inner function

The `ValidationError` includes:

- `message`: Human-readable error message
- `fieldErrors`: Array of `{ field, message, code }` for each validation error
- `zodError`: Original Zod error for debugging
- `toJSON()`: Serializable format for API responses

## Files Reference

- Utilities: `mods/common/src/utils/withErrorHandlingAndValidation.ts`
- Errors: `mods/common/src/errors/ValidationError.ts`
- Schemas: `mods/common/src/schemas/`
- Types (client interfaces): `mods/common/src/types/`
