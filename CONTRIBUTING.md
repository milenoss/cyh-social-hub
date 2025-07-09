# Contributing to Choose Your Hard

Thank you for considering contributing to Choose Your Hard! This document outlines the process for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please read it before contributing.

## How Can I Contribute?

### Reporting Bugs

- Check if the bug has already been reported in the Issues section
- Use the bug report template when creating a new issue
- Include detailed steps to reproduce the bug
- Include screenshots if applicable
- Specify your operating system, browser, and any other relevant information

### Suggesting Features

- Check if the feature has already been suggested in the Issues section
- Use the feature request template when creating a new issue
- Provide a clear description of the feature and its benefits
- Include mockups or examples if possible

### Pull Requests

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Local Development
1. Clone your fork of the repository
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example`
4. Start the development server: `npm run dev`

## Style Guide

### Code Style
- We use ESLint and Prettier for code formatting
- Run `npm run lint` before committing

### Commit Messages
- Use clear, descriptive commit messages
- Start with a verb in the present tense (e.g., "Add feature" not "Added feature")
- Reference issue numbers when applicable

### TypeScript
- Use proper typing for all variables and functions
- Avoid using `any` type when possible
- Document complex types with comments

### Component Structure
- Use functional components with hooks
- Keep components small and focused on a single responsibility
- Use the shadcn/ui component library when possible

## Testing

- Write tests for new features and bug fixes
- Run the test suite before submitting a PR: `npm test`

## Documentation

- Update documentation for any changes to APIs or features
- Document complex code with clear comments
- Update the README.md if necessary

## Review Process

1. A maintainer will review your PR
2. Changes may be requested before merging
3. Once approved, a maintainer will merge your PR
4. Your contribution will be acknowledged in the release notes

## Thank You!

Your contributions help make Choose Your Hard better for everyone. We appreciate your time and effort!