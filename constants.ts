
import { Owner } from './types';

export const MOCK_OWNERS: Record<string, Owner> = {
  'ABC-1234': {
    name: 'John Doe',
    address: '123 Tech Lane, Silicon Valley, CA 94025',
    phone: '+1-555-0101',
    totalViolations: 0,
  },
  'XYZ-9876': {
    name: 'Jane Smith',
    address: '456 Oak Street, Metropolis, NY 10001',
    phone: '+1-555-0202',
    totalViolations: 1,
  },
  'DL-4CN-0012': {
    name: 'Rahul Sharma',
    address: 'Flat 402, Sunshine Apartments, Bangalore, KA 560001',
    phone: '+91-9876543210',
    totalViolations: 2,
  }
};

export const FINE_AMOUNTS = {
  FIRST_OFFENSE: 2000, // Includes helmet cost
  SUBSEQUENT: 5000 // Pure penalty
};

export const SYSTEM_INSTRUCTION = `
You are a high-precision computer vision AI for a traffic enforcement system. 
Analyze the provided image for two specific things:
1. Is the rider wearing a helmet? (Boolean: hasHelmet)
2. What is the vehicle's number plate? (String: plateNumber)

Rules:
- If you see a helmet clearly, hasHelmet = true. 
- If no helmet is visible or partial/incorrect usage, hasHelmet = false.
- Extract the plate number exactly as seen. If blurry, make your best guess.
- Return ONLY JSON.
`;
