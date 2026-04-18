# Code Review Rules — ERP Guatemala

## JavaScript / React

- Use `const`/`let`, never `var`
- Use functional components with hooks only — no class components
- Keep components focused: one responsibility per component
- Extract API calls to `src/services/api/` — never fetch directly inside components
- Use `async/await` over `.then()` chains
- Avoid `console.log` in committed code

## State Management

- Use `useState` for local UI state
- Use `useContext` (AuthContext) for auth state only
- Do not mutate state directly — always use setter functions

## Styling

- Use Tailwind CSS utility classes
- No inline `style` props unless dynamically calculated values
- Follow existing color conventions: green = success, red = error/danger, amber = warning, blue = info

## API / Services

- All API calls must use the axios instance from `src/services/api/client.js`
- Handle errors explicitly — do not swallow exceptions silently
- Use `try/catch` in all async service functions

## Forms

- Validate required fields before submitting
- Disable submit button while request is in flight
- Show user-facing error messages from API responses

## Security

- Never store sensitive data beyond tokens in localStorage
- Never construct SQL or template strings with user input
- Sanitize user input before rendering as HTML
