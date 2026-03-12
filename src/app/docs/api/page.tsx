'use client';

import Link from 'next/link';
import { IonIcon } from '@/components/ion-icon';
import { Card, CardContent } from '@/components/ui/card';

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              href="/dashboard/developer"
              className="p-2 -ml-2 hover:bg-muted rounded-lg transition-smooth"
            >
              <IonIcon name="arrow-back-outline" size="20px" />
            </Link>
            <h1 className="text-lg font-semibold text-foreground ml-2">
              API Documentation
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 max-w-4xl">
        <div className="prose prose-invert max-w-none">
          {/* Overview */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Overview</h2>
            <p className="text-muted-foreground">
              The TADA VTU Reseller API allows you to integrate our VTU services into your own applications. 
              You can purchase airtime and data bundles programmatically for your customers.
            </p>
            <Card className="mt-4 border-green-500/20 bg-green-500/5">
              <CardContent className="p-4">
                <p className="text-sm text-foreground">
                  <strong>Base URL:</strong> <code className="bg-muted px-2 py-1 rounded text-green-400">https://tadavtu.com/api</code>
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Authentication */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Authentication</h2>
            <p className="text-muted-foreground mb-4">
              All API requests require authentication using API Key and Secret in the request headers.
            </p>
            <Card className="border-border">
              <CardContent className="p-4">
                <pre className="text-sm overflow-x-auto">
                  <code className="text-green-400">
{`X-API-Key: your_api_key_here
X-API-Secret: your_api_secret_here
Content-Type: application/json`}
                  </code>
                </pre>
              </CardContent>
            </Card>

            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <IonIcon name="information-circle" size="20px" color="#f59e0b" />
                Getting Your API Credentials
              </h4>
              <ol className="text-sm text-muted-foreground space-y-1 ml-6 list-decimal">
                <li>Log in to your TADA VTU dashboard</li>
                <li>Navigate to Developer API section</li>
                <li>Click "Create API Key"</li>
                <li>Give it a descriptive name</li>
                <li>Copy both the API Key and Secret (Secret is only shown once!)</li>
              </ol>
            </div>
          </section>

          {/* Rate Limits */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Rate Limits</h2>
            <ul className="text-muted-foreground space-y-2">
              <li>• <strong>60 requests per minute</strong> per API key</li>
              <li>• <strong>₦100,000 monthly transaction limit</strong> (default, can be increased)</li>
            </ul>
          </section>

          {/* Endpoints */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Endpoints</h2>

            {/* Check Balance */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">1. Check Balance</h3>
              <p className="text-muted-foreground mb-3">Get your current wallet balance.</p>
              
              <Card className="border-border mb-3">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded">GET</span>
                    <code className="text-sm text-green-400">/v1/wallet/balance</code>
                  </div>
                </CardContent>
              </Card>

              <p className="text-sm text-muted-foreground mb-2">Response:</p>
              <Card className="border-border">
                <CardContent className="p-4">
                  <pre className="text-xs overflow-x-auto">
                    <code className="text-green-400">
{`{
  "status": true,
  "data": {
    "balance": 50000.00,
    "currency": "NGN",
    "apiKey": {
      "monthlyLimit": 100000,
      "monthlyUsage": 0,
      "availableLimit": 100000
    }
  }
}`}
                    </code>
                  </pre>
                </CardContent>
              </Card>
            </div>

            {/* Buy Airtime */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">2. Buy Airtime</h3>
              <p className="text-muted-foreground mb-3">Purchase airtime for any Nigerian phone number.</p>
              
              <Card className="border-border mb-3">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded">POST</span>
                    <code className="text-sm text-green-400">/v1/airtime/buy</code>
                  </div>
                </CardContent>
              </Card>

              <p className="text-sm text-muted-foreground mb-2">Request Body:</p>
              <Card className="border-border mb-3">
                <CardContent className="p-4">
                  <pre className="text-xs overflow-x-auto">
                    <code className="text-green-400">
{`{
  "network": "MTN",
  "phone": "08012345678",
  "amount": 100,
  "reference": "your_unique_reference"
}`}
                    </code>
                  </pre>
                </CardContent>
              </Card>

              <p className="text-sm text-muted-foreground mb-2">Parameters:</p>
              <ul className="text-sm text-muted-foreground space-y-1 mb-3">
                <li>• <code className="bg-muted px-1.5 py-0.5 rounded text-xs">network</code> (required): MTN, AIRTEL, GLO, or 9MOBILE</li>
                <li>• <code className="bg-muted px-1.5 py-0.5 rounded text-xs">phone</code> (required): 11-digit phone number</li>
                <li>• <code className="bg-muted px-1.5 py-0.5 rounded text-xs">amount</code> (required): ₦50 - ₦50,000</li>
                <li>• <code className="bg-muted px-1.5 py-0.5 rounded text-xs">reference</code> (optional): Unique reference for idempotency</li>
              </ul>

              <p className="text-sm text-muted-foreground mb-2">Success Response:</p>
              <Card className="border-border">
                <CardContent className="p-4">
                  <pre className="text-xs overflow-x-auto">
                    <code className="text-green-400">
{`{
  "status": true,
  "message": "Airtime purchase successful",
  "data": {
    "transactionId": "TXN123456789",
    "network": "MTN",
    "phone": "08012345678",
    "amount": 100,
    "date": "2024-03-11T10:30:00Z"
  }
}`}
                    </code>
                  </pre>
                </CardContent>
              </Card>
            </div>

            {/* Get Data Plans */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">3. Get Data Plans</h3>
              <p className="text-muted-foreground mb-3">Retrieve available data plans for a specific network. <span className="text-amber-400">(Requires authentication)</span></p>
              
              <Card className="border-border mb-3">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded">GET</span>
                    <code className="text-sm text-green-400">/v1/data/plans?network=MTN</code>
                  </div>
                </CardContent>
              </Card>

              <p className="text-sm text-muted-foreground mb-2">Query Parameters:</p>
              <ul className="text-sm text-muted-foreground space-y-1 mb-3">
                <li>• <code className="bg-muted px-1.5 py-0.5 rounded text-xs">network</code> (required): MTN, AIRTEL, GLO, or 9MOBILE</li>
              </ul>

              <p className="text-sm text-muted-foreground mb-2">Response:</p>
              <Card className="border-border">
                <CardContent className="p-4">
                  <pre className="text-xs overflow-x-auto">
                    <code className="text-green-400">
{`{
  "status": "success",
  "data": [
    {
      "id": "501-1-default-0",
      "serviceID": "501",
      "name": "100MB - 1 Day",
      "size": "100MB - 1 Day",
      "price": 100,
      "validity": "1 Day",
      "type": "sme",
      "network": "MTN"
    },
    {
      "id": "502-1-default-1",
      "name": "1GB - 30 Days",
      "size": "1GB - 30 Days",
      "price": 300,
      "validity": "30 Days",
      "type": "sme",
      "network": "MTN"
    }
  ],
  "source": "tada",
  "network": "MTN",
  "totalPlans": 20,
  "types": ["sme", "direct", "gifting", "sme_share"]
}`}
                    </code>
                  </pre>
                </CardContent>
              </Card>
            </div>

            {/* Buy Data */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">4. Buy Data</h3>
              <p className="text-muted-foreground mb-3">Purchase data bundle for any Nigerian phone number.</p>
              
              <Card className="border-border mb-3">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded">POST</span>
                    <code className="text-sm text-green-400">/v1/data/buy</code>
                  </div>
                </CardContent>
              </Card>

              <p className="text-sm text-muted-foreground mb-2">Request Body:</p>
              <Card className="border-border mb-3">
                <CardContent className="p-4">
                  <pre className="text-xs overflow-x-auto">
                    <code className="text-green-400">
{`{
  "network": "MTN",
  "phone": "08012345678",
  "planId": "501-1-default-0",
  "amount": 300,
  "reference": "your_unique_reference"
}`}
                    </code>
                  </pre>
                </CardContent>
              </Card>

              <p className="text-sm text-muted-foreground mb-2">Parameters:</p>
              <ul className="text-sm text-muted-foreground space-y-1 mb-3">
                <li>• <code className="bg-muted px-1.5 py-0.5 rounded text-xs">network</code> (required): MTN, AIRTEL, GLO, or 9MOBILE</li>
                <li>• <code className="bg-muted px-1.5 py-0.5 rounded text-xs">phone</code> (required): 11-digit phone number</li>
                <li>• <code className="bg-muted px-1.5 py-0.5 rounded text-xs">planId</code> (required): Get from /v1/data/plans endpoint</li>
                <li>• <code className="bg-muted px-1.5 py-0.5 rounded text-xs">reference</code> (optional): Unique reference for idempotency</li>
              </ul>

              <p className="text-sm text-muted-foreground mb-2">Success Response:</p>
              <Card className="border-border">
                <CardContent className="p-4">
                  <pre className="text-xs overflow-x-auto">
                    <code className="text-green-400">
{`{
  "status": true,
  "message": "Data purchase successful",
  "data": {
    "transactionId": "TXN123456789",
    "network": "MTN",
    "phone": "08012345678",
    "plan": "1GB - 30 Days",
    "amount": 300,
    "date": "2024-03-11T10:30:00Z"
  }
}`}
                    </code>
                  </pre>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Webhooks */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Webhooks</h2>
            <p className="text-muted-foreground mb-4">
              Webhooks allow you to receive real-time notifications when transactions are completed or failed.
            </p>

            <h4 className="font-semibold text-foreground mb-2">Webhook Events</h4>
            <ul className="text-muted-foreground space-y-1 mb-4">
              <li>• <code className="bg-muted px-1.5 py-0.5 rounded text-xs">transaction.completed</code> - Transaction succeeded</li>
              <li>• <code className="bg-muted px-1.5 py-0.5 rounded text-xs">transaction.failed</code> - Transaction failed</li>
            </ul>

            <p className="text-sm text-muted-foreground mb-2">Webhook Payload:</p>
            <Card className="border-border">
              <CardContent className="p-4">
                <pre className="text-xs overflow-x-auto">
                  <code className="text-green-400">
{`{
  "event": "transaction.completed",
  "timestamp": "2024-03-11T10:30:05Z",
  "data": {
    "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
    "reference": "your_unique_reference",
    "type": "airtime",
    "network": "MTN",
    "phone": "08012345678",
    "amount": 100,
    "status": "success"
  }
}`}
                  </code>
                </pre>
              </CardContent>
            </Card>
          </section>

          {/* Error Handling */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Error Handling</h2>
            
            <p className="text-sm text-muted-foreground mb-2">Error Response Format:</p>
            <Card className="border-border mb-4">
              <CardContent className="p-4">
                <pre className="text-xs overflow-x-auto">
                  <code className="text-red-400">
{`{
  "status": false,
  "message": "Insufficient balance to complete this transaction"
}`}
                  </code>
                </pre>
              </CardContent>
            </Card>

            <h4 className="font-semibold text-foreground mb-2">Common Error Codes</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-foreground">Message</th>
                    <th className="text-left py-2 text-foreground">Description</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2">Invalid or inactive API credentials</td>
                    <td className="py-2">API key is invalid or inactive</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2">Too many requests</td>
                    <td className="py-2">Rate limit exceeded, slow down</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2">Insufficient balance</td>
                    <td className="py-2">Not enough balance in wallet</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2">Invalid network</td>
                    <td className="py-2">Network provider not supported</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2">Service unavailable</td>
                    <td className="py-2">VTU service temporarily unavailable</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Code Examples */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Code Examples</h2>

            <h3 className="text-lg font-semibold text-foreground mb-3">Node.js</h3>
            <Card className="border-border mb-6">
              <CardContent className="p-4">
                <pre className="text-xs overflow-x-auto">
                  <code className="text-green-400">
{`const axios = require('axios');

const TADA_API_KEY = process.env.TADA_API_KEY;
const TADA_API_SECRET = process.env.TADA_API_SECRET;
const BASE_URL = 'https://tadavtu.com/api';

async function buyAirtime(network, phone, amount) {
  const response = await axios.post(
    \`\${BASE_URL}/v1/airtime/buy\`,
    { network, phone, amount },
    {
      headers: {
        'X-API-Key': TADA_API_KEY,
        'X-API-Secret': TADA_API_SECRET
      }
    }
  );
  return response.data;
}

async function getDataPlans(network) {
  const response = await axios.get(
    \`\${BASE_URL}/v1/data/plans?network=\${network}\`,
    {
      headers: {
        'X-API-Key': TADA_API_KEY,
        'X-API-Secret': TADA_API_SECRET
      }
    }
  );
  return response.data;
}`}
                  </code>
                </pre>
              </CardContent>
            </Card>

            <h3 className="text-lg font-semibold text-foreground mb-3">Python</h3>
            <Card className="border-border">
              <CardContent className="p-4">
                <pre className="text-xs overflow-x-auto">
                  <code className="text-green-400">
{`import requests
import os

API_KEY = os.getenv('TADA_API_KEY')
API_SECRET = os.getenv('TADA_API_SECRET')
BASE_URL = 'https://tadavtu.com/api'

def buy_airtime(network, phone, amount):
    response = requests.post(
        f'{BASE_URL}/v1/airtime/buy',
        json={'network': network, 'phone': phone, 'amount': amount},
        headers={
            'X-API-Key': API_KEY,
            'X-API-Secret': API_SECRET
        }
    )
    return response.json()

def get_data_plans(network):
    response = requests.get(
        f'{BASE_URL}/v1/data/plans?network={network}',
        headers={
            'X-API-Key': API_KEY,
            'X-API-Secret': API_SECRET
        }
    )
    return response.json()`}
                  </code>
                </pre>
              </CardContent>
            </Card>
          </section>

          {/* Support */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Support</h2>
            <p className="text-muted-foreground mb-4">Need help? Contact us:</p>
            <ul className="text-muted-foreground space-y-2">
              <li>• <strong>Email:</strong> developer@tadavtu.com</li>
              <li>• <strong>Dashboard:</strong> <Link href="/dashboard/developer" className="text-green-500 hover:text-green-400">Developer API</Link></li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
