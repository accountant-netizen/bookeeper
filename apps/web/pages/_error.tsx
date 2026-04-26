import type { NextPage } from 'next';
import type { AppProps } from 'next/app';

interface ErrorProps {
  statusCode?: number;
}

const Error: NextPage<ErrorProps> = ({ statusCode }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        {statusCode || 500}
      </h1>
      <p style={{ fontSize: '1.25rem', marginBottom: '2rem', color: '#666' }}>
        {statusCode === 404 ? 'Page not found' : 'Something went wrong'}
      </p>
      <a 
        href="/"
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#007bff',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          fontSize: '1rem'
        }}
      >
        Go back home
      </a>
    </div>
  );
};

Error.getInitialProps = async ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
