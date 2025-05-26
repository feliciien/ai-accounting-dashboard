import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { getFirebaseFirestore } from '../lib/firebase';

interface ReferralSystemProps {
  className?: string;
}

const ReferralSystem: React.FC<ReferralSystemProps> = ({ className = '' }) => {
  const { currentUser, updateUploadLimits } = useAuth();
  const [referralLink, setReferralLink] = useState<string>('');
  const [referralCount, setReferralCount] = useState<number>(0);
  const [bonusUploadsEarned, setBonusUploadsEarned] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadReferralData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Generate referral link with user ID
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/?ref=${currentUser.uid}`;
        setReferralLink(link);

        // Get user's referral data from Firestore
        const db = getFirebaseFirestore();
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setReferralCount(userData.referrals?.length || 0);
          setBonusUploadsEarned(userData.bonusUploadsEarned || 0);
        } else {
          // Initialize referral data if it doesn't exist
          await updateDoc(userDocRef, {
            referrals: [],
            bonusUploadsEarned: 0
          });
        }
      } catch (error) {
        console.error('Error loading referral data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReferralData();
  }, [currentUser]);

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check URL for referral parameter on component mount
  useEffect(() => {
    const checkForReferral = async () => {
      if (!currentUser) return;

      const urlParams = new URLSearchParams(window.location.search);
      const refId = urlParams.get('ref');

      // If there's a referral ID and it's not the current user
      if (refId && refId !== currentUser.uid) {
        try {
          const db = getFirebaseFirestore();
          
          // Update referrer's document
          const referrerDocRef = doc(db, 'users', refId);
          const referrerDoc = await getDoc(referrerDocRef);
          
          if (referrerDoc.exists()) {
            // Check if this user is already in the referrals array
            const referrerData = referrerDoc.data();
            const referrals = referrerData.referrals || [];
            
            if (!referrals.includes(currentUser.uid)) {
              // Add current user to referrer's referrals
              await updateDoc(referrerDocRef, {
                referrals: arrayUnion(currentUser.uid)
              });
              
              // Check if referrer has reached 3 referrals
              if ((referrals.length + 1) % 3 === 0) {
                // Award bonus upload
                await updateDoc(referrerDocRef, {
                  bonusUploadsEarned: increment(1)
                });
              }
            }
          }
          
          // Remove referral parameter from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('Error processing referral:', error);
        }
      }
    };
    
    checkForReferral();
  }, [currentUser]);

  if (loading) {
    return (
      <div className={`p-4 bg-white rounded-lg shadow ${className}`}>
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={`p-4 bg-white rounded-lg shadow ${className}`}>
        <h3 className="text-lg font-medium text-gray-900">Invite Friends & Get Rewards</h3>
        <p className="mt-2 text-sm text-gray-500">Sign in to get your referral link and start earning bonus uploads.</p>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white rounded-lg shadow ${className}`}>
      <h3 className="text-lg font-medium text-gray-900">Invite Friends & Get Rewards</h3>
      
      <div className="mt-3">
        <p className="text-sm text-gray-500 mb-2">
          Invite 3 friends and unlock 1 extra file upload this month.
        </p>
        
        <div className="flex items-center mt-2">
          <div className="flex-grow">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
          <button
            onClick={copyReferralLink}
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <div>
          <p className="text-sm font-medium text-gray-500">Friends invited</p>
          <p className="text-2xl font-bold text-gray-900">{referralCount}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Bonus uploads earned</p>
          <p className="text-2xl font-bold text-gray-900">{bonusUploadsEarned}</p>
        </div>
      </div>
      
      <div className="mt-4">
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block text-primary-600">
                Progress to next bonus
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-primary-600">
                {referralCount % 3}/3
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary-200">
            <div
              style={{ width: `${(referralCount % 3) * 33.33}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500"
            ></div>
          </div>
        </div>
      </div>
      
      <div className="mt-4">
        <button
          onClick={() => {
            // Share via system share dialog if available
            if (navigator.share) {
              navigator.share({
                title: 'Join me on Workfusion',
                text: 'I am using Workfusion to manage my finances. Join me and we both get rewards!',
                url: referralLink,
              });
            } else {
              // Fallback to copy
              copyReferralLink();
            }
          }}
          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share with Friends
        </button>
      </div>
    </div>
  );
};

export default ReferralSystem;