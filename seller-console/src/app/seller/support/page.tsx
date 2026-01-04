'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiService } from '@/lib/api';

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState('tickets');

  const { data: supportData } = useQuery({
    queryKey: ['support'],
    queryFn: () => apiService.getSupportData(),
    staleTime: 30 * 1000,
  });

  const tickets = [
    { id: 1, subject: 'Payment not received', category: 'billing', status: 'open', priority: 'high', created: '2024-01-15', lastUpdate: '2024-01-15' },
    { id: 2, subject: 'Product upload issue', category: 'technical', status: 'in_progress', priority: 'medium', created: '2024-01-14', lastUpdate: '2024-01-15' },
    { id: 3, subject: 'Shipping rate question', category: 'general', status: 'resolved', priority: 'low', created: '2024-01-13', lastUpdate: '2024-01-14' },
  ];

  const faqs = [
    { 
      category: 'Getting Started',
      questions: [
        { q: 'How do I add my first product?', a: 'Navigate to Products > Add Product and fill in the required information including title, description, price, and images.' },
        { q: 'How do I set up shipping rates?', a: 'Go to Shipping & Fulfillment > Shipping Rates to configure rates based on zones and weight ranges.' },
        { q: 'When will I receive my first payout?', a: 'Payouts are processed weekly. Your first payout will be available 7 days after your first sale.' }
      ]
    },
    { 
      category: 'Orders & Payments',
      questions: [
        { q: 'How do I process an order?', a: 'Go to Orders, find the pending order, and click "Process" to confirm and prepare for shipping.' },
        { q: 'What payment methods are supported?', a: 'We support M-Pesa, Airtel Money, bank transfers, and major credit cards.' },
        { q: 'How do I handle refunds?', a: 'Navigate to the specific order and click "Issue Refund" to process customer refunds.' }
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Support Center</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Get help and manage support tickets</p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Contact Support
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Create Ticket
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Open Tickets</p>
          <p className="text-2xl font-bold text-red-600">3</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Need attention</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Response Time</p>
          <p className="text-2xl font-bold text-blue-600">2.5 hrs</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Last 30 days</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Resolution Rate</p>
          <p className="text-2xl font-bold text-green-600">94%</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This month</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Satisfaction Score</p>
          <p className="text-2xl font-bold text-purple-600">4.8/5</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Customer rating</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'tickets', label: 'Support Tickets' },
              { id: 'knowledge', label: 'Knowledge Base' },
              { id: 'contact', label: 'Contact Options' },
              { id: 'resources', label: 'Resources' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'tickets' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Support Tickets</h3>
                <div className="flex space-x-2">
                  <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option>All Status</option>
                    <option>Open</option>
                    <option>In Progress</option>
                    <option>Resolved</option>
                  </select>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                    New Ticket
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ticket ID</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Subject</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {tickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2 text-sm font-medium text-blue-600">#{ticket.id.toString().padStart(4, '0')}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">{ticket.subject}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white capitalize">{ticket.category}</td>
                        <td className="px-4 py-2">
                          <span className={`text-sm font-medium capitalize ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                            {ticket.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{new Date(ticket.created).toLocaleDateString()}</td>
                        <td className="px-4 py-2">
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-800 text-xs">View</button>
                            <button className="text-green-600 hover:text-green-800 text-xs">Reply</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Frequently Asked Questions</h3>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Search knowledge base..."
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="space-y-6">
                {faqs.map((category, categoryIndex) => (
                  <div key={categoryIndex}>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{category.category}</h4>
                    <div className="space-y-3">
                      {category.questions.map((faq, faqIndex) => (
                        <div key={faqIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                          <button className="w-full px-4 py-3 text-left font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg">
                            {faq.q}
                          </button>
                          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-400">{faq.a}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contact Support</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Live Chat</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Get instant help from our support team</p>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                    Start Chat
                  </button>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Email Support</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Send us an email and we'll respond within 24 hours</p>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                    Send Email
                  </button>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Phone Support</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Call us for urgent issues</p>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
                    Call Now
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">Support Hours</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Live Chat & Email</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">24/7 Available</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Phone Support</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Mon-Fri: 8:00 AM - 6:00 PM EAT</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Help Resources</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Getting Started Guide</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Complete guide to setting up your seller account and adding your first products.</p>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Read Guide →</button>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Video Tutorials</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Step-by-step video tutorials covering all platform features.</p>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Watch Videos →</button>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">API Documentation</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Technical documentation for developers and advanced integrations.</p>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">View Docs →</button>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Best Practices</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Tips and strategies to optimize your sales and customer satisfaction.</p>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Learn More →</button>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Community Forum</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Connect with other sellers and share experiences.</p>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Join Forum →</button>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">System Status</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Check current system status and planned maintenance.</p>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Check Status →</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}