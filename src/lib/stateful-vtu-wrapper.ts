/**
 * TypeScript wrapper for the stateful VTU system
 * Handles the CommonJS import and provides type safety
 */

import { spawn } from 'child_process';
import path from 'path';

export interface VTUResponse {
  reply: string;
  success: boolean;
  error?: string;
}

/**
 * Handle WhatsApp message using the stateful VTU system
 * Uses child process to execute the Node.js script
 */
export async function handleWhatsAppMessage(
  message: string, 
  phoneNumber: string
): Promise<VTUResponse> {
  return new Promise((resolve) => {
    try {
      const scriptPath = path.join(process.cwd(), 'openclaw', 'stateful-vtu.js');
      
      // Execute the script with message and phone as arguments
      const child = spawn('node', [scriptPath, message], {
        env: {
          ...process.env,
          USER_PHONE: phoneNumber,
          NODE_ENV: process.env.NODE_ENV || 'production'
        },
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0 && output.trim()) {
          resolve({
            reply: output.trim(),
            success: true
          });
        } else {
          console.error('VTU Script Error:', errorOutput);
          resolve({
            reply: '❌ Service temporarily unavailable. Please try again later.',
            success: false,
            error: errorOutput || 'Script execution failed'
          });
        }
      });

      child.on('error', (error) => {
        console.error('VTU Script Spawn Error:', error);
        resolve({
          reply: '❌ Service temporarily unavailable. Please try again later.',
          success: false,
          error: error.message
        });
      });

      // Set timeout for the process
      setTimeout(() => {
        child.kill();
        resolve({
          reply: '❌ Request timeout. Please try again.',
          success: false,
          error: 'Process timeout'
        });
      }, 30000); // 30 second timeout

    } catch (error) {
      console.error('VTU Wrapper Error:', error);
      resolve({
        reply: '❌ Service temporarily unavailable. Please try again later.',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}