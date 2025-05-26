import React from 'react';
import Button from './common/Button';
import { useNavigate } from 'react-router-dom';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  company: string;
  content: string;
  image?: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Sarah Johnson',
    role: 'CFO',
    company: 'TechStart Inc.',
    content: 'This AI-powered accounting dashboard has revolutionized how we handle our finances. The automated insights and anomaly detection have saved us countless hours.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
  },
  {
    id: 2,
    name: 'Michael Chen',
    role: 'Small Business Owner',
    company: 'Chen Consulting',
    content: 'The financial forecasting and AI recommendations have helped us make better business decisions. It\'s like having a financial advisor right at your fingertips.',
    image: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
  },
  {
    id: 3,
    name: 'Emma Davis',
    role: 'Accounting Manager',
    company: 'Global Solutions Ltd',
    content: 'The workflow automation and real-time analytics have streamlined our accounting processes significantly. The UI is intuitive and the insights are invaluable.',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
  }
];

const Testimonials: React.FC<{withCTA?: boolean}> = ({ withCTA = false }) => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/pricing');
  };

  return (
    <div className="bg-gradient-to-b from-white to-primary-50 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-lg font-semibold leading-8 tracking-tight text-primary-600">Testimonials</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Trusted by Industry Leaders
          </p>
          <p className="mt-4 text-lg text-gray-600">
            See how businesses like yours are transforming their financial management with our AI-powered platform
          </p>
        </div>
        <div className="mx-auto mt-16 flow-root max-w-2xl sm:mt-20 lg:mx-0 lg:max-w-none">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.id}
                className="flex flex-col justify-between rounded-2xl bg-white p-8 shadow-lg ring-1 ring-gray-200 transition-all duration-200 hover:shadow-xl"
              >
                <div className="flex items-start gap-4">
                  {testimonial.image && (
                    <img
                      className="h-12 w-12 flex-none rounded-full bg-gray-50"
                      src={testimonial.image}
                      alt={testimonial.name}
                    />
                  )}
                  <div className="flex-auto">
                    <div className="text-base font-semibold leading-7 text-gray-900">{testimonial.name}</div>
                    <div className="text-sm leading-6 text-gray-600">
                      {testimonial.role} at {testimonial.company}
                    </div>
                  </div>
                </div>
                <blockquote className="mt-6 text-base leading-7 text-gray-600">
                  {testimonial.content}
                </blockquote>
              </div>
            ))}
          </div>
        </div>
        
        {withCTA && (
          <div className="mt-16 text-center">
            <h3 className="text-2xl font-bold text-gray-900">Ready to transform your financial management?</h3>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Join thousands of satisfied customers who have streamlined their accounting processes with our AI-powered platform.
            </p>
            <div className="mt-8">
              <Button
                variant="primary"
                size="xl"
                onClick={handleGetStarted}
                className="mx-auto"
              >
                Get Started with Pro
              </Button>
              <p className="mt-3 text-sm text-gray-500">
                14-day money-back guarantee. No credit card required for free trial.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Testimonials;