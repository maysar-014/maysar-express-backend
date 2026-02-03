'use client';

import { useState } from 'react';

interface SupportTicket {
  id: string;
  subject: string;
  category: 'technical' | 'billing' | 'orders' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdDate: string;
  lastUpdated: string;
  description: string;
  responses: { author: string; message: string; timestamp: string }[];
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
}

const mockTickets: SupportTicket[] = [
  {
    id: 'TKT-2024-001',
    subject: 'Payment settlement delay',
    category: 'billing',
    priority: 'high',
    status: 'in-progress',
    createdDate: '2024-01-14',
    lastUpdated: '2024-01-15',
    description: 'My payment for order PO-2024-001 has not been settled yet. It has been 5 days since the order was delivered.',
    responses: [
      {
        author: 'Support Team',
        message: 'Thank you for contacting us. We are investigating the payment settlement delay. Our finance team will review your case within 24 hours.',
        timestamp: '2024-01-15 10:30'
      }
    ]
  },
  {
    id: 'TKT-2024-002',
    subject: 'API integration issues',
    category: 'technical',
    priority: 'medium',
    status: 'resolved',
    createdDate: '2024-01-12',
    lastUpdated: '2024-01-13',
    description: 'Having trouble with inventory API endpoints. Getting 500 errors when updating stock levels.',
    responses: [
      {
        author: 'Technical Support',
        message: 'The issue has been resolved. There was a temporary server issue that has been fixed. Please try again.',
        timestamp: '2024-01-13 14:20'
      }
    ]
  }
];

const mockFAQs: FAQItem[] = [
  {
    id: '1',
    question: 'How long does it take to receive payments?',
    answer: 'Payments are typically processed within 2-3 business days after order delivery confirmation. Bank transfers may take an additional 1-2 days to reflect in your account.',
    category: 'Payments',
    helpful: 45
  },
  {
    id: '2',
    question: 'How do I update my product catalog?',
    answer: 'You can update your product catalog through the Catalog Management section. Navigate to Catalog > Products, select the product you want to edit, and make your changes. Changes are reflected immediately.',
    category: 'Catalog',
    helpful: 32
  },
  {
    id: '3',
    question: 'What are the quality standards required?',
    answer: 'All products must meet Tanzania Bureau of Standards (TBS) requirements. Additionally, maintain a quality score above 90%, on-time delivery rate above 95%, and customer satisfaction rating above 4.0/5.0.',
    category: 'Quality',
    helpful: 28
  },
  {
    id: '4',
    question: 'How do I set up volume discounts?',
    answer: 'Volume discounts can be configured in the Contract Pricing section. Go to Pricing > Pricing Rules, select Volume Discounts, and set your quantity tiers and corresponding discount percentages.',
    category: 'Pricing',
    helpful: 21
  }
];

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'faq' | 'contact' | 'resources'>('tickets');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredFAQs = mockFAQs.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Support</h1>
        <button 
          onClick={() => setIsCreatingTicket(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Support Ticket
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Open Tickets</h3>
          <p className="text-2xl font-bold text-blue-600 mt-2">{mockTickets.filter(t => t.status === 'open').length}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">In Progress</h3>
          <p className="text-2xl font-bold text-yellow-600 mt-2">{mockTickets.filter(t => t.status === 'in-progress').length}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Resolved</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">{mockTickets.filter(t => t.status === 'resolved').length}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Response Time</h3>
          <p className="text-2xl font-bold text-purple-600 mt-2">4.2h</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'tickets', label: 'Support Tickets' },
            { key: 'faq', label: 'FAQ' },
            { key: 'contact', label: 'Contact Support' },
            { key: 'resources', label: 'Resources' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Support Tickets Tab */}
      {activeTab === 'tickets' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Support Tickets</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ticket ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {mockTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{ticket.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{ticket.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">{ticket.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{ticket.createdDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FAQ Tab */}
      {activeTab === 'faq' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search FAQ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="space-y-4">
              {filteredFAQs.map((faq) => (
                <div key={faq.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-md font-semibold text-gray-900 dark:text-white">{faq.question}</h3>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {faq.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{faq.answer}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      <button className="text-xs text-green-600 hover:text-green-800">
                        Helpful ({faq.helpful})
                      </button>
                      <button className="text-xs text-gray-500 hover:text-gray-700">
                        Not Helpful
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contact Support Tab */}
      {activeTab === 'contact' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Support</h4>
                  <p className="text-sm text-gray-900 dark:text-white">supplier-support@maysar.co.tz</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Response time: 4-6 hours</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Support</h4>
                  <p className="text-sm text-gray-900 dark:text-white">+255 22 123 4567</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Mon-Fri: 8:00 AM - 6:00 PM EAT</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">WhatsApp Support</h4>
                  <p className="text-sm text-gray-900 dark:text-white">+255 712 345 678</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Mon-Fri: 8:00 AM - 8:00 PM EAT</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Emergency Support</h4>
                  <p className="text-sm text-gray-900 dark:text-white">+255 700 123 456</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">24/7 for critical issues</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Contact Form</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Brief description of your issue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="">Select Category</option>
                    <option value="technical">Technical</option>
                    <option value="billing">Billing</option>
                    <option value="orders">Orders</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message</label>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Describe your issue in detail"
                  />
                </div>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resources Tab */}
      {activeTab === 'resources' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Supplier Handbook',
                description: 'Complete guide to using the supplier platform',
                type: 'PDF',
                size: '2.5 MB'
              },
              {
                title: 'API Documentation',
                description: 'Technical documentation for API integration',
                type: 'Web',
                size: 'Online'
              },
              {
                title: 'Quality Standards Guide',
                description: 'Requirements and best practices for quality',
                type: 'PDF',
                size: '1.8 MB'
              },
              {
                title: 'Pricing Guidelines',
                description: 'How to set up contracts and pricing rules',
                type: 'PDF',
                size: '1.2 MB'
              },
              {
                title: 'Video Tutorials',
                description: 'Step-by-step video guides',
                type: 'Video',
                size: 'Playlist'
              },
              {
                title: 'Best Practices',
                description: 'Tips for successful supplier operations',
                type: 'PDF',
                size: '900 KB'
              }
            ].map((resource, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{resource.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{resource.description}</p>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {resource.type}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{resource.size}</span>
                  </div>
                  <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                    {resource.type === 'Web' ? 'View' : 'Download'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ticket Details - {selectedTicket.id}</h3>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Close
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedTicket.subject}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedTicket.status)}`}>
                    {selectedTicket.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">{selectedTicket.description}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Responses</label>
                <div className="space-y-3">
                  {selectedTicket.responses.map((response, index) => (
                    <div key={index} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">{response.author}</span>
                        <span className="text-xs text-blue-600 dark:text-blue-400">{response.timestamp}</span>
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300">{response.message}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add Response</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Type your response..."
                />
              </div>
              <div className="flex space-x-4 mt-6">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Send Response
                </button>
                <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                  Close Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}