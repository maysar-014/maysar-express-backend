'use client';

import { useState, useEffect } from 'react';
import { courierApi } from '@/lib/api';

export default function SupportPage() {
  const [supportTickets, setSupportTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSupportData = async () => {
      try {
        setLoading(true);
        const ticketsData = await courierApi.getSupportTickets();
        setSupportTickets(ticketsData.data || []);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch support data:', err);
        setError('Failed to load support data');
      } finally {
        setLoading(false);
      }
    };

    fetchSupportData();
  }, []);

  const handleCreateTicket = () => {
    // Would open a modal or navigate to create ticket page
    console.log('Create new support ticket');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading support tickets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">Support</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 uppercase tracking-wider">
            Get help with delivery operations and system issues
          </p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          System-assisted support system
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Create Ticket</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
            Report issues or request assistance
          </p>
          <button
            onClick={handleCreateTicket}
            className="w-full px-3 py-2 bg-orange-600 text-white text-xs font-medium rounded-md hover:bg-orange-700"
          >
            New Support Ticket
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">FAQ</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
            Find answers to common questions
          </p>
          <button className="w-full px-3 py-2 bg-gray-600 text-white text-xs font-medium rounded-md hover:bg-gray-700">
            Browse FAQ
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Live Chat</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
            Connect with support agents
          </p>
          <button className="w-full px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700">
            Start Chat
          </button>
        </div>
      </div>

      {/* Support Tickets */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Support Tickets</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">Your recent support interactions</p>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {supportTickets.map((ticket) => (
              <div key={ticket.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                        {ticket.subject}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        ticket.status === 'open'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                          : ticket.status === 'resolved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                      }`}>
                        {ticket.status}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        ticket.priority === 'high'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                          : ticket.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                      }`}>
                        {ticket.priority} priority
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {ticket.category} • Created {new Date(ticket.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {ticket.description}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Last update: {new Date(ticket.lastUpdate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {ticket.responses.length} responses
                    </p>
                  </div>
                </div>

                {/* Latest Response */}
                {ticket.responses.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-start space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        ticket.responses[ticket.responses.length - 1].type === 'system'
                          ? 'bg-blue-500 text-white'
                          : 'bg-green-500 text-white'
                      }`}>
                        {ticket.responses[ticket.responses.length - 1].author[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {ticket.responses[ticket.responses.length - 1].author} • {new Date(ticket.responses[ticket.responses.length - 1].timestamp).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {ticket.responses[ticket.responses.length - 1].message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md p-4">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wider mb-2">
          Contact Support
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100">Emergency Support</p>
            <p className="text-blue-800 dark:text-blue-200">+255 123 456 789</p>
            <p className="text-blue-700 dark:text-blue-300">24/7 for critical issues</p>
          </div>
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100">Technical Support</p>
            <p className="text-blue-800 dark:text-blue-200">support@maysar.co.tz</p>
            <p className="text-blue-700 dark:text-blue-300">Response within 2 hours</p>
          </div>
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100">Training Support</p>
            <p className="text-blue-800 dark:text-blue-200">training@maysar.co.tz</p>
            <p className="text-blue-700 dark:text-blue-300">For system training requests</p>
          </div>
        </div>
      </div>
    </div>
  );
}
