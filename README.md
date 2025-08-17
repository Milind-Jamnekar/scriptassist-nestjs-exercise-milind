# Initial Setup Fixes

- The project did not start successfully after cloning, so I first debugged and fixed critical setup issues to get the application running.
- The codebase was not formatted, which caused unnecessary style changes in commits and made it harder to review actual fixes.
- To ensure a clean baseline, I ran code formatting across the entire project. This keeps further commits focused only on meaningful changes.

# Refactoring Summary: Tasks Module (Controller + Service)

## 1. **Replaced In-Memory Filtering & Pagination with SQL Queries**

### 🔄 Before:

- The controller fetched all tasks from the database.
- Filtering and pagination were performed **in-memory**, using `Array.filter()` and `Array.slice()`.

### ✅ After:

- Introduced `findAllWithFilters()` in the service using **TypeORM QueryBuilder**.
- Moved all filtering (`status`, `priority`) and pagination (`page`, `limit`) to SQL.

### 📈 Benefits:

- Reduces **database roundtrips** and **RAM usage**.
- Handles **large datasets efficiently**.
- Enables proper **pagination metadata** like `totalPages`, `total`.

---

## 2. **Validated Query Parameters via DTO and Class Validators**

### 🔄 Before:

- Query parameters were raw strings and unchecked.
- Possible invalid `status`, `priority`, `page`, etc.

### ✅ After:

- Introduced `TaskQueryDto` with `class-validator` decorators:
  ```ts
  @IsEnum(TaskStatus)
  @IsNumberString()
  ```
- Applied NestJS ValidationPipe to auto-validate and transform types.

### 📈 Benefits:

- Prevents invalid data from reaching your logic.
- Ensures type safety (string → number, etc.).
- Reduces need for manual error handling in the controller.

## 3. **Replaced Repository Access in Controller**

### 🔄 Before:

- Controller accessed taskRepository directly (tight coupling).

### ✅ After:

- All database logic now lives in TasksService.

### 📈 Benefits:

- Enforces Separation of Concerns.
- Makes the controller simpler and testable.
- Centralizes data access and business logic.

## 4. **Added Transactions to Critical Operations (create, update)**

### 🔄 Before:

- Task was saved first, then added to the queue in two separate steps.

### ✅ After:

- Used DataSource.transaction() to:
  - Save task
  - Add to queue
- Throws error if either fails.

### 📈 Benefits:

- Prevents inconsistent state (e.g., task saved but not queued).
- Ensures atomicity — either everything happens or nothing does.

## 5. **Batch Operations Using SQL Instead of N+1**

### 🔄 Before:

- Looping through each task ID and updating/deleting them one by one.

### After:

- Introduced:
  ```ts
  batchUpdateStatus(); // Uses .update().whereInIds()
  batchDelete(); // Uses .delete().whereInIds()
  ```

### 📈 Benefits:

- Eliminates N+1 problem (reduces DB load from N calls to 1).
- Drastically improves performance for bulk operations.

## 6. **Optimized Task Statistics with SQL Aggregation**

### 🔄 Before:

- Loaded all tasks and used `.filter()` to compute stats.

### ✅ After:

- Used a single SQL query with `COUNT(\*) FILTER (...)` expressions.

### 📈 Benefits:

- Reduces memory usage and query time.
- Can scale with large task datasets.
- Returns stats in real-time with low overhead.

## 7. **Improved Task Existence Checks (findOne, remove)**

### 🔄 Before:

- Sometimes did unnecessary `count` queries before fetching.
  Or fetched first, then removed (2 DB hits).

### ✅ After:

`findOne` does a direct lookup.
`remove()` uses `delete()` and checks `affected` rows.

### 📈 Benefits:

- Reduces to a single database operation.
- Avoids redundant logic.
- Cleaner and more efficient.

## 8. **Standardized Response Format & HTTP Semantics**

### ✅ Changes:

- Added `@HttpCode(204)` for DELETE — standard REST practice.
- Provided consistent structure in findAll() response:
  ```ts
  {
    "data": [...],
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
  ```

### 📈 Benefits:

- More predictable API behavior for clients.
- Easier for frontend to paginate and display results.
- Conforms to HTTP standards.

## 9. **Validation for Batch Actions**

### ✅ Changes:

- Added `BatchProcessDto` and `TaskBatchProcess` enum.
- Switched from `string` actions to strict enum handling.

### 📈 Benefits:

- Prevents invalid actions.
- Type-safe.
- Easier to extend and maintain.
