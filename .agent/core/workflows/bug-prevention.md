# Bug Prevention Knowledge Base

> Record common pitfalls and prevention measures. Keep updated when new issues found.

- **Scope**: Applies to the **entire project** (all source, tests, configs).

---

## Encoding Issues

### BUG-001: File Read/Write Encoding Error

**Symptoms**: Garbled characters, `UnicodeDecodeError`
**Root cause**: Not specifying encoding when opening files
**Prevention**: Always explicitly specify `encoding='utf-8'`. See [core-rules](../core-rules.md) and [examples](../examples.md).

```python
# Wrong
with open('file.txt', 'r') as f:
    content = f.read()

# Correct
with open('file.txt', 'r', encoding='utf-8') as f:
    content = f.read()
```

---

## Test Data Conflicts

### BUG-002: Test Data Conflicts with Production

**Symptoms**: Tests fail intermittently, data pollution
**Root cause**: Using fixed test data names
**Prevention**: Use `autotest_` prefix + dynamic RunID

```python
# Wrong
test_user = "test_user"

# Correct
import uuid
run_id = uuid.uuid4().hex[:8]
test_user = f"autotest_user_{run_id}"
```

---

## Exception Handling

### BUG-003: Swallowing Exceptions

**Symptoms**: Silent failures, hard to debug
**Root cause**: Bare except blocks
**Prevention**: Catch specific exceptions, always log

```python
# Wrong
try:
    do_something()
except:
    pass

# Correct
try:
    do_something()
except SpecificError as e:
    logger.error(f"Failed: {e}")
    raise
```

---

## Path Issues

### BUG-004: Path Separator Issues

**Symptoms**: File not found on different OS
**Root cause**: Hardcoded backslashes
**Prevention**: Use `pathlib` or forward slashes

```python
# Wrong
path = "src\\main\\file.py"

# Correct
from pathlib import Path
path = Path("src") / "main" / "file.py"
```

---

## Async Issues

### BUG-005: Blocking in Async Context

**Symptoms**: Event loop blocked, poor performance
**Root cause**: Calling sync functions in async code
**Prevention**: Use async versions or run_in_executor

```python
# Wrong
async def fetch():
    time.sleep(1)  # Blocks!

# Correct
async def fetch():
    await asyncio.sleep(1)
```

---

## Resource Management

### BUG-006: Resource Leaks

**Symptoms**: Memory growth, connection exhaustion
**Root cause**: Not properly closing resources
**Prevention**: Use context managers

```python
# Wrong
f = open('file.txt')
content = f.read()
# Forgot to close!

# Correct
with open('file.txt', encoding='utf-8') as f:
    content = f.read()
```

---

## Template

When adding new entries, use this format:

```markdown
### BUG-XXX: Brief Description

**Symptoms**: Observable behavior
**Root cause**: Why it happens
**Prevention**: How to avoid
**Example**: Code showing wrong vs correct approach
```

---

*Keep this file updated when discovering new pitfalls*
*Protocol version: 2.1.0*
