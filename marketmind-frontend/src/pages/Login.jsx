import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Divider } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../context/AuthContext';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#fff',
    borderRadius: 1.5,
  },
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegistering) {
        await register({ email, password, fullname: fullName });
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (isRegistering ? 'Failed to register. Please try again.' : 'Failed to login. Please check your credentials.')
      );
      console.error(isRegistering ? 'Registration error:' : 'Login error:', err);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      setError('Failed to login with Google. Please try again.');
      console.error('Google login error:', err);
    }
  };

  const toggleAuthMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
  };

  return (
    <div className="flex min-h-full w-full flex-1 flex-col bg-[#E8F1FC]">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[400px]">
          <Typography component="h1" variant="h4" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
            {isRegistering ? 'Create your account' : 'Welcome to MarketMind'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(15,23,42,0.62)', mb: 3 }}>
            {isRegistering ? 'Sign up to access your workspace' : 'Sign in to access your dashboard'}
          </Typography>

          {error ? (
            <Typography color="error" sx={{ mb: 2, textAlign: 'center' }} variant="body2">
              {error}
            </Typography>
          ) : null}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            {isRegistering ? (
              <TextField
                margin="normal"
                required
                fullWidth
                id="fullName"
                label="Full Name"
                name="fullName"
                autoComplete="name"
                autoFocus
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                sx={fieldSx}
              />
            ) : null}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus={!isRegistering}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={fieldSx}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={fieldSx}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disableElevation
              sx={{
                mt: 3,
                mb: 2,
                py: 1.25,
                bgcolor: '#2563eb',
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '1rem',
                borderRadius: 1.5,
                '&:hover': { bgcolor: '#1d4ed8' },
              }}
            >
              {isRegistering ? 'Sign Up' : 'Sign In'}
            </Button>

            <Box sx={{ mt: 1, textAlign: 'center' }}>
              <Button onClick={toggleAuthMode} color="primary" fullWidth sx={{ textTransform: 'none', color: '#2563eb' }}>
                {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </Button>
            </Box>

            <Divider sx={{ my: 3, borderColor: 'rgba(15,23,42,0.12)' }}>or</Divider>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleLogin}
              sx={{
                py: 1.1,
                textTransform: 'none',
                borderRadius: 1.5,
                borderColor: 'rgba(15,23,42,0.18)',
                bgcolor: '#fff',
                color: '#0f172a',
                '&:hover': {
                  borderColor: 'rgba(15,23,42,0.35)',
                  bgcolor: '#fafafa',
                },
              }}
            >
              Continue with Google
            </Button>
          </Box>
        </div>
      </div>
    </div>
  );
};

export default Login;
