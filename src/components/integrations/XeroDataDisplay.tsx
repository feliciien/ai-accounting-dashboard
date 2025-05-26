import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useIntegration } from '../../context/IntegrationContext';

interface XeroInvoice {
  InvoiceID: string;
  InvoiceNumber: string;
  Type: string;
  Contact: {
    Name: string;
  };
  Date: string;
  DueDate: string;
  Status: string;
  Total: number;
  AmountDue: number;
  CurrencyCode: string;
}

interface XeroContact {
  ContactID: string;
  Name: string;
  EmailAddress?: string;
  Phones?: Array<{
    PhoneType: string;
    PhoneNumber: string;
  }>;
  Addresses?: Array<{
    AddressType: string;
    AddressLine1?: string;
    City?: string;
    Region?: string;
    PostalCode?: string;
    Country?: string;
  }>;
}

const XeroDataDisplay: React.FC = () => {
  const { currentUser } = useAuth();
  const { xero } = useIntegration();
  const [invoices, setInvoices] = useState<XeroInvoice[]>([]);
  const [contacts, setContacts] = useState<XeroContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch data if Xero is connected
    if (xero.connected && currentUser) {
      fetchXeroData();
    }
  }, [xero.connected, currentUser]);

  const fetchXeroData = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch invoices
      const invoicesResponse = await fetch('/api/xero/data/invoices', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!invoicesResponse.ok) {
        throw new Error('Failed to fetch Xero invoices');
      }
      
      const invoicesData = await invoicesResponse.json();
      setInvoices(invoicesData.Invoices || []);
      
      // Fetch contacts
      const contactsResponse = await fetch('/api/xero/data/contacts', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!contactsResponse.ok) {
        throw new Error('Failed to fetch Xero contacts');
      }
      
      const contactsData = await contactsResponse.json();
      setContacts(contactsData.Contacts || []);
    } catch (err) {
      console.error('Error fetching Xero data:', err);
      setError('Failed to load Xero data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!xero.connected) {
    return null; // Don't render anything if not connected
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Your Xero Data</h2>
      
      {isLoading && (
        <div className="text-center py-4">
          <p className="text-gray-600">Loading Xero data...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {!isLoading && !error && (
        <div className="space-y-6">
          {/* Invoices Section */}
          <div>
            <h3 className="text-lg font-medium mb-2">Recent Invoices</h3>
            {invoices.length > 0 ? (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoices.slice(0, 5).map((invoice) => (
                        <tr key={invoice.InvoiceID}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.InvoiceNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.Contact.Name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(invoice.Date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${invoice.Status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {invoice.Status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {invoice.CurrencyCode} {invoice.Total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No invoices found.</p>
            )}
          </div>
          
          {/* Contacts Section */}
          <div>
            <h3 className="text-lg font-medium mb-2">Recent Contacts</h3>
            {contacts.length > 0 ? (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {contacts.slice(0, 5).map((contact) => (
                        <tr key={contact.ContactID}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{contact.Name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.EmailAddress || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {contact.Phones && contact.Phones.length > 0 
                              ? contact.Phones[0].PhoneNumber 
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No contacts found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default XeroDataDisplay;