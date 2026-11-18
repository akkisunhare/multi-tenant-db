import mongoose, { Connection } from 'mongoose';
import { env } from './env';

let centralConnection: Connection;
let publicConnection: Connection;

const connectionOptions: mongoose.ConnectOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

export const initCentralDB = async (): Promise<Connection> => {
  if (centralConnection && centralConnection.readyState === 1) {
    return centralConnection;
  }
  const uri = `${env.MONGODB_URI.replace(/\/$/, '')}/${env.CENTRAL_DB_NAME}`;
  centralConnection = mongoose.createConnection(uri, connectionOptions);

  centralConnection.on('connected', () => {
    console.log(`[Database] Central DB connected: ${env.CENTRAL_DB_NAME}`);
  });

  centralConnection.on('error', (err) => {
    console.error(`[Database] Central DB connection error:`, err);
  });

  await centralConnection.asPromise();
  return centralConnection;
};

export const initPublicDB = async (): Promise<Connection> => {
  if (publicConnection && publicConnection.readyState === 1) {
    return publicConnection;
  }
  const uri = `${env.MONGODB_URI.replace(/\/$/, '')}/${env.PUBLIC_DB_NAME}`;
  publicConnection = mongoose.createConnection(uri, connectionOptions);

  publicConnection.on('connected', () => {
    console.log(`[Database] Public DB connected: ${env.PUBLIC_DB_NAME}`);
  });

  publicConnection.on('error', (err) => {
    console.error(`[Database] Public DB connection error:`, err);
  });

  await publicConnection.asPromise();
  return publicConnection;
};

export const getCentralConnection = (): Connection => {
  if (!centralConnection) {
    throw new Error('Central DB connection not initialized.');
  }
  return centralConnection;
};

export const getPublicConnection = (): Connection => {
  if (!publicConnection) {
    throw new Error('Public DB connection not initialized.');
  }
  return publicConnection;
};

export const closeDatabases = async (): Promise<void> => {
  if (centralConnection) {
    await centralConnection.close();
  }
  if (publicConnection) {
    await publicConnection.close();
  }
};
