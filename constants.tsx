
import React from 'react';
import { Product } from './types';

export const APP_NAME = "Aptic Onboarding";

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Biashara Loan',
    description: 'Competitive interest rates for SMEs to scale operations.',
    icon: '💰',
    category: 'Finance'
  },
  {
    id: '2',
    name: 'KRA Tax Buddy',
    description: 'Automated VAT and Income Tax filing assistance.',
    icon: '📊',
    category: 'Compliance'
  },
  {
    id: '3',
    name: 'Corporate Shield',
    description: 'Comprehensive insurance for office assets and staff.',
    icon: '🛡️',
    category: 'Insurance'
  },
  {
    id: '4',
    name: 'Trade Connect',
    description: 'Exclusive access to regional East African trade networks.',
    icon: '🌍',
    category: 'Networking'
  }
];

export const MOCK_COMPANY_DOCS = [
  {
    type: "Certificate of Incorporation",
    content: `REPUBLIC OF KENYA - THE COMPANIES ACT, 2015
CERTIFICATE OF INCORPORATION
Company Name: SIMSTEL TECHNOLOGIES LIMITED
Registration Number: PVT-7UQ4K9
Date of Incorporation: 14th March 2021
Issued by the Registrar of Companies.`
  },
  {
    type: "CR12",
    content: `COMPANY REGISTRY – CR12
Company Name: SIMSTEL TECHNOLOGIES LIMITED
Registration Number: PVT-7UQ4K9
Directors:
1. James Epale, ID: 31245678, KRA PIN: A012345678Z
2. Alice Wambui, ID: 29876543, KRA PIN: A098765432Y
Registered Office: P.O. Box 45678 – 00100, Nairobi, Kenya
Last Filed Return Date: 12th Jan 2024`
  },
  {
    type: "KRA PIN Certificate",
    content: `KENYA REVENUE AUTHORITY - PIN CERTIFICATE
Taxpayer Name: SIMSTEL TECHNOLOGIES LIMITED
PIN: P051234567Q
Registration Date: 20th March 2021
iTax Platform Verification Code: 992-KLA-12`
  }
];

export const MOCK_INDIVIDUAL_DOCS = [
  {
    type: "National ID (Front)",
    content: `REPUBLIC OF KENYA - IDENTITY CARD
Name: DAVID OTIENO NYONG'O
ID Number: 34567890
Date of Birth: 12.05.1992
Sex: M
Place of Issue: NAIROBI`
  },
  {
    type: "KRA PIN Certificate",
    content: `KENYA REVENUE AUTHORITY - PIN CERTIFICATE
Taxpayer Name: DAVID OTIENO NYONG'O
PIN: A001928374M
Registration Date: 10th January 2015`
  }
];
