import { Link } from 'react-router-dom';
import { 
  CreditCard, 
  Send, 
  CheckCircle, 
  Shield, 
  Clock,
  DollarSign,
  ArrowRight,
  Ticket
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function HowItWorks() {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('howItWorks.title')}</h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              {t('howItWorks.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        
        {/* Trust Message */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {t('howItWorks.trustMessage')}
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t('howItWorks.trustDesc')}
          </p>
        </div>

        {/* Flow Diagram */}
        <div className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Step 1 */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-500 h-full flex flex-col">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                  1
                </div>
                
                <div className="mb-4 flex justify-center">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                    <CreditCard className="w-10 h-10 text-blue-600" />
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
                  {t('howItWorks.step1Title')}
                </h3>
                
                <p className="text-gray-600 text-center mb-4 flex-1">
                  {t('howItWorks.step1Desc')}
                </p>
                
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800 border border-blue-200">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{t('howItWorks.step1Note')}</span>
                  </div>
                </div>
              </div>
              
              {/* Arrow */}
              <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                <ArrowRight className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-500 h-full flex flex-col">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                  2
                </div>
                
                <div className="mb-4 flex justify-center">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
                    <Send className="w-10 h-10 text-purple-600" />
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
                  {t('howItWorks.step2Title')}
                </h3>
                
                <p className="text-gray-600 text-center mb-4 flex-1">
                  {t('howItWorks.step2Desc')}
                </p>
                
                <div className="bg-purple-50 rounded-lg p-3 text-sm text-purple-800 border border-purple-200">
                  <div className="flex items-start gap-2">
                    <Ticket className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{t('howItWorks.step2Note')}</span>
                  </div>
                </div>
              </div>
              
              {/* Arrow */}
              <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                <ArrowRight className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-green-500 h-full flex flex-col">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                  3
                </div>
                
                <div className="mb-4 flex justify-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
                  {t('howItWorks.step3Title')}
                </h3>
                
                <p className="text-gray-600 text-center mb-4 flex-1">
                  {t('howItWorks.step3Desc')}
                </p>
                
                <div className="bg-green-50 rounded-lg p-3 text-sm text-green-800 border border-green-200">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{t('howItWorks.step3Note')}</span>
                  </div>
                </div>
              </div>
              
              {/* Arrow */}
              <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                <ArrowRight className="w-8 h-8 text-green-600" />
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-emerald-500 h-full flex flex-col">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                  4
                </div>
                
                <div className="mb-4 flex justify-center">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                    <DollarSign className="w-10 h-10 text-emerald-600" />
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
                  {t('howItWorks.step4Title')}
                </h3>
                
                <p className="text-gray-600 text-center mb-4 flex-1">
                  {t('howItWorks.step4Desc')}
                </p>
                
                <div className="bg-emerald-50 rounded-lg p-3 text-sm text-emerald-800 border border-emerald-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{t('howItWorks.step4Note')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Protection Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            {t('howItWorks.securityTitle')}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* For Buyers */}
            <div className="bg-white rounded-xl shadow-lg p-8 border-t-4 border-blue-600">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{t('howItWorks.forBuyers')}</h3>
              </div>
              
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{t('howItWorks.paymentProtection')}</p>
                    <p className="text-sm text-gray-600">{t('howItWorks.paymentProtectionDesc')}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{t('howItWorks.disputeWindow')}</p>
                    <p className="text-sm text-gray-600">{t('howItWorks.disputeWindowDesc')}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{t('howItWorks.verifiedTickets')}</p>
                    <p className="text-sm text-gray-600">{t('howItWorks.verifiedTicketsDesc')}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{t('howItWorks.sellerRatings')}</p>
                    <p className="text-sm text-gray-600">{t('howItWorks.sellerRatingsDesc')}</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* For Sellers */}
            <div className="bg-white rounded-xl shadow-lg p-8 border-t-4 border-purple-600">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{t('howItWorks.forSellers')}</h3>
              </div>
              
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{t('howItWorks.guaranteedPayment')}</p>
                    <p className="text-sm text-gray-600">{t('howItWorks.guaranteedPaymentDesc')}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{t('howItWorks.noChargebacks')}</p>
                    <p className="text-sm text-gray-600">{t('howItWorks.noChargebacksDesc')}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{t('howItWorks.automaticRelease')}</p>
                    <p className="text-sm text-gray-600">{t('howItWorks.automaticReleaseDesc')}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{t('howItWorks.buildReputation')}</p>
                    <p className="text-sm text-gray-600">{t('howItWorks.buildReputationDesc')}</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            {t('howItWorks.faqTitle')}
          </h2>
          
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
              <h4 className="font-bold text-gray-900 mb-2">{t('howItWorks.faqQ1')}</h4>
              <p className="text-gray-600">
                {t('howItWorks.faqA1')}
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-600">
              <h4 className="font-bold text-gray-900 mb-2">{t('howItWorks.faqQ2')}</h4>
              <p className="text-gray-600">
                {t('howItWorks.faqA2')}
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-600">
              <h4 className="font-bold text-gray-900 mb-2">{t('howItWorks.faqQ3')}</h4>
              <p className="text-gray-600">
                {t('howItWorks.faqA3')}
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-600">
              <h4 className="font-bold text-gray-900 mb-2">{t('howItWorks.faqQ4')}</h4>
              <p className="text-gray-600">
                {t('howItWorks.faqA4')}
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">{t('howItWorks.ctaTitle')}</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            {t('howItWorks.ctaSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-colors"
            >
              {t('howItWorks.browseEvents')}
            </Link>
            <Link
              to="/user-profile"
              className="px-8 py-4 bg-blue-700 text-white font-bold rounded-lg hover:bg-blue-800 transition-colors border-2 border-white"
            >
              {t('howItWorks.startSelling')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
