# Contributing to hono-query

We love your input! We want to make contributing to hono-query as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Requests

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm/yarn/pnpm

### Setup

1. Fork and clone the repository:
```bash
git clone https://github.com/your-username/hono-query.git
cd hono-query
```

2. Install dependencies:
```bash
npm install
```

3. Start development mode:
```bash
npm run dev
```

### Project Structure

```
src/
├── lib/
│   └── hono-query.tsx    # Main library code
├── index.ts              # Package entry point
├── __tests__/            # Test files
└── examples/             # Usage examples
```

### Available Scripts

- `npm run build` - Build the library
- `npm run dev` - Watch mode for development
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run typecheck` - Type checking
- `npm run lint` - Lint code
- `npm run lint:fix` - Fix linting issues

## Testing

We use Vitest for testing. Tests should be placed in the `__tests__` directory or alongside the code they test with a `.test.ts` or `.spec.ts` suffix.

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

Example test structure:

```tsx
// src/__tests__/hono-query.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HonoQueryProvider, createHonoQueryProxy } from '../lib/hono-query';

describe('hono-query', () => {
  it('should create proxy with correct structure', () => {
    const mockClient = {};
    const proxy = createHonoQueryProxy(mockClient);
    
    expect(proxy).toBeDefined();
    // Add your assertions
  });
});
```

## Code Style

We use ESLint and Prettier for code formatting. The configuration is included in the project.

### Key Guidelines

- Use TypeScript strictly - no `any` types
- Follow React best practices
- Write descriptive variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Use functional programming patterns

### Code Formatting

```bash
# Check formatting
npm run lint

# Auto-fix issues
npm run lint:fix
```

## Documentation

### API Documentation

Update the API documentation in `docs/API_REFERENCE.md` when:
- Adding new functions or types
- Changing existing APIs
- Adding new features

### Examples

Add examples in `docs/EXAMPLES.md` when:
- Implementing new features
- Solving common use cases
- Demonstrating best practices

### Migration Guides

Update `docs/MIGRATION.md` when:
- Making breaking changes
- Deprecating features
- Changing recommended patterns

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): description

[optional body]

[optional footer]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Examples

```
feat(hooks): add support for infinite queries
fix(types): correct mutation input type inference
docs(api): update examples for method-specific mutations
```

## Reporting Bugs

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/scanpaigns/hono-query/issues).

### Bug Report Template

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

### Bug Report Example

```markdown
## Bug: useQuery hook not invalidating cache correctly

### Summary
When using method-specific mutations, the cache is not being invalidated for nested routes.

### Steps to Reproduce
1. Create a query for `api.users[':id'].posts.useQuery()`
2. Perform a mutation with `api.users[':id'].posts.post.useMutation()`
3. Observe that the cache is not invalidated

### Expected Behavior
The cache should be automatically invalidated after the mutation.

### Actual Behavior
The cache remains stale and doesn't reflect the new data.

### Environment
- hono-query version: 2.0.0
- React Query version: 5.56.2
- Node version: 18.17.0
```

## Feature Requests

We also use GitHub issues for feature requests. 

### Feature Request Template

```markdown
## Feature Request: [Feature Name]

### Problem
Describe the problem this feature would solve.

### Solution
Describe the solution you'd like to see.

### Alternatives
Describe alternatives you've considered.

### Additional Context
Add any other context about the feature request.
```

## Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions  
- **PATCH** version for backwards-compatible bug fixes

### Release Checklist

Before releasing:

- [ ] All tests pass
- [ ] Documentation is updated
- [ ] CHANGELOG is updated
- [ ] Version is bumped appropriately
- [ ] Build artifacts are generated correctly

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to open an issue for any questions about contributing!

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team. All complaints will be reviewed and investigated and will result in a response that is deemed necessary and appropriate to the circumstances.

## Recognition

Contributors will be recognized in:

- The project README
- Release notes for significant contributions
- The project's contributor page

Thank you for contributing to hono-query! 🎉 