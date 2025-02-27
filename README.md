# Next.js CRUD Application

https://mellow-alfajores-d14ba2.netlify.app/

A modern CRUD (Create, Read, Update, Delete) application built with Next.js, React Query, and shadcn/ui. This application demonstrates how to build a production-ready web application with proper state management, form validation, and error handling.

## Features

- Create, Read, Update, and Delete posts
- Form validation using React Hook Form and Zod
- State management with React Query
- Modern UI components from shadcn/ui
- Responsive design with Tailwind CSS
- Error handling and loading states
- Toast notifications for user feedback

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Technologies Used

- Next.js
- React Query
- React Hook Form
- Zod
- shadcn/ui
- Tailwind CSS
- TypeScript

## Project Structure

- `/app` - Next.js app router pages and layouts
- `/components` - Reusable UI components
- `/lib` - Utility functions, API calls, and types
- `/public` - Static assets

## API Integration

This project uses the JSONPlaceholder API for demonstration purposes. In a production environment, you would replace these API calls with your own backend endpoints.

## Error Handling

The application includes comprehensive error handling:
- API error handling with React Query
- Form validation errors with React Hook Form and Zod
- User feedback through toast notifications

## Deployment

The application can be easily deployed to Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy

## Contributing

Feel free to submit issues and pull requests.

## License

MIT
