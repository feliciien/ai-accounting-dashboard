interface EnvVars {
  REACT_APP_EXCHANGE_RATE_API_KEY: string;
  // Add other environment variables as needed
}

export const validateEnvVars = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Required environment variables
  const requiredVars: (keyof EnvVars)[] = [
    'REACT_APP_EXCHANGE_RATE_API_KEY'
  ];

  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const getEnvVar = (name: keyof EnvVars): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not defined`);
  }
  return value;
};