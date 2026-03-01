import React, { useState } from 'react';
import { GeminiService } from '../services/gemini';
import { useAuth } from './AuthContext';

const ImageCreator: React.FC<any> = ({ state, setState }) => {
  const { prompt, image, aspectRatio, subjectSlots } = state;
  const [loading, setLoading] = useState(false);
  const { isLoggedIn, credits, deductCredit, setShowAuthModal } = useAuth();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    // 1. Auth Guard
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }

    // 2. Credit Guard
    if (credits !== null && credits < 1) {
      alert("Insufficient credits. Please top up.");
      return;
    }

    setLoading(true);

    // 3. AUTO DEDUCT (happens on click, before image is even ready)
    const success = await deductCredit(1, 'Image Generation');
    
    if (!success) {
      alert("Transaction failed. Please try again.");
      setLoading(false);
      return;
    }

    try {
      const references = subjectSlots.filter((s: any) => s).map((s: string) => s.split(',')[1]);
      const url = await GeminiService.generateImage(prompt, aspectRatio, references);
      setState((prev: any) => ({ ...prev, image: url }));
    } catch (err) {
      console.error("Generation failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <button 
        onClick={handleGenerate} 
        disabled={loading}
        className="bg-indigo-600 px-8 py-4 rounded-xl text-white font-bold"
      >
        {loading ? 'Processing...' : 'Generate Art (1 Credit)'}
      </button>
      {image && <img src={image} className="mt-4 rounded-lg" />}
    </div>
  );
};

export default ImageCreator;