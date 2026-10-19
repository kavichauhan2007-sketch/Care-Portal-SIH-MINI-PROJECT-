'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { speakThenListen, VOICE_SCRIPTS, matchesCommand, CMD, isVoiceGuideEnabled } from '@/lib/voiceGuide';
import { ArrowRight, ArrowLeft, Users, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const familyConditions = [
  { name: 'Diabetes', icon: '🩸', color: 'bg-red-50' },
  { name: 'Heart Disease', icon: '❤️', color: 'bg-pink-50' },
  { name: 'High Blood Pressure', icon: '💉', color: 'bg-purple-50' },
  { name: 'Cancer', icon: '🔬', color: 'bg-orange-50' },
  { name: 'Asthma', icon: '🫁', color: 'bg-blue-50' },
  { name: 'Arthritis', icon: '🦴', color: 'bg-yellow-50' },
  { name: 'Kidney Disease', icon: '🩻', color: 'bg-green-50' },
  { name: 'Stroke', icon: '🧠', color: 'bg-indigo-50' },
];

const relations = ['Mother', 'Father', 'Sibling', 'Grandparent', 'Aunt/Uncle'];

export default function FamilyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [langCode, setLangCode] = useState('en');
  const [selectedConditions, setSelectedConditions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  // Voice guidance state
  const [voiceMode, setVoiceMode] = useState<'idle' | 'speaking' | 'listening'>('idle');
  const stopVoiceRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem('careportal_language') || 'en';
    setLangCode(savedLang);

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      stopVoiceRef.current?.();
    };
  }, []);

  // Auto voice guidance on mount (if Voice Guide Mode is enabled)
  useEffect(() => {
    if (!mounted || !isVoiceGuideEnabled()) return;
    const script = VOICE_SCRIPTS.family[langCode === 'hi' ? 'hi' : 'en'];
    setVoiceMode('speaking');
    const stop = speakThenListen(
      script,
      langCode,
      (transcript) => {
        setVoiceMode('idle');
        if (transcript.includes('diabetes') || transcript.includes('शुगर') || transcript.includes('मधुमेह')) {
          toggleCondition('Diabetes', 'Father');
        } else if (transcript.includes('heart') || transcript.includes('हार्ट') || transcript.includes('दिल')) {
          toggleCondition('Heart Disease', 'Father');
        } else if (transcript.includes('bp') || transcript.includes('blood pressure') || transcript.includes('रक्तचाप')) {
          toggleCondition('High Blood Pressure', 'Mother');
        } else if (transcript.includes('cancer') || transcript.includes('कैंसर')) {
          toggleCondition('Cancer', 'Grandparent');
        } else if (matchesCommand(transcript, CMD.skip) || matchesCommand(transcript, CMD.agree) || matchesCommand(transcript, CMD.submit)) {
          handleComplete();
        }
      },
      () => setVoiceMode('listening'),
      () => setVoiceMode('idle')
    );
    stopVoiceRef.current = stop;
    return () => stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, langCode]);

  const toggleCondition = (condition: string, relation: string) => {
    const key = `${condition}_${relation}`;
    setSelectedConditions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getSelectedCount = () => {
    return Object.values(selectedConditions).filter(Boolean).length;
  };

  const handleComplete = async () => {
    stopVoiceRef.current?.();
    setLoading(true);
    try {
      const patientId = localStorage.getItem('careportal_patient_id');
      const sessionId = localStorage.getItem('careportal_session_id');

      // Save family history entries
      const selectedEntries = Object.entries(selectedConditions)
        .filter(([_, selected]) => selected)
        .map(([key, _]) => {
          const [condition, relation] = key.split('_');
          return {
            patient_id: patientId,
            relation: relation,
            condition: condition,
            status: 'unknown',
          };
        });

      if (selectedEntries.length > 0) {
        await supabase.from('family_medical_history').insert(selectedEntries);
      }

      localStorage.setItem('careportal_family_history', JSON.stringify(selectedEntries));

      // Update session as completed
      await supabase
        .from('patient_sessions')
        .update({
          current_step: 'review',
          progress: 95,
        })
        .eq('id', sessionId);

      toast({
        title: 'Family history saved',
        description: 'Proceeding to final intake review...',
      });

      router.push('/review');
    } catch (error) {
      console.error('Error saving family history:', error);
      router.push('/review');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    stopVoiceRef.current?.();
    setLoading(true);
    try {
      const sessionId = localStorage.getItem('careportal_session_id');
      
      if (sessionId) {
        await supabase
          .from('patient_sessions')
          .update({
            current_step: 'review',
            progress: 95,
          })
          .eq('id', sessionId);
      }

      router.push('/review');
    } catch (error) {
      console.error(error);
      router.push('/review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-purple-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Family Medical History
          </h1>
          <p className="text-muted-foreground mb-2">
            Does anyone in your family have these conditions?
          </p>
          {getSelectedCount() > 0 && (
            <p className="text-sm text-primary font-medium">
              {getSelectedCount()} condition{getSelectedCount() > 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        {/* Conditions Grid */}
        <div className="space-y-4 mb-8">
          {familyConditions.map((condition, index) => (
            <motion.div
              key={condition.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`p-6 ${condition.color} border-0`}>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-4xl">{condition.icon}</span>
                  <h3 className="text-xl font-semibold flex-1">{condition.name}</h3>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {relations.map((relation) => {
                    const key = `${condition.name}_${relation}`;
                    const isSelected = selectedConditions[key];

                    return (
                      <button
                        key={relation}
                        onClick={() => toggleCondition(condition.name, relation)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-white hover:bg-gray-50 border border-gray-200'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4" />}
                        {relation}
                      </button>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Previous Records */}
        <Card className="p-6 mb-8 bg-gradient-to-r from-blue-50 to-cyan-50 border-0">
          <h3 className="font-semibold text-lg mb-2">
            🔗 Do you have previous medical records at this hospital?
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Your doctor can access your previous visits if they exist in our system.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-white">
              Yes, I've been here before
            </Button>
            <Button variant="ghost" size="sm">
              First time here
            </Button>
          </div>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
            className="flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Button
            onClick={handleComplete}
            disabled={loading}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {loading ? 'Saving...' : 'Complete Registration'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={loading}
            className="flex-shrink-0"
          >
            Skip
          </Button>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-green-50 rounded-lg text-center text-sm text-green-800">
          <p className="font-medium mb-1">🧬 Why family history matters</p>
          <p>Some conditions can run in families. This helps your doctor provide better care.</p>
        </div>
      </motion.div>

      {/* Voice Status Indicator */}
      {voiceMode !== 'idle' && (
        <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-white text-xs font-bold pointer-events-none select-none ${
          voiceMode === 'speaking' ? 'bg-[#00685f]' : 'bg-red-500'
        }`}>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-white" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          {voiceMode === 'speaking'
            ? (langCode === 'hi' ? '🔊 बोल रहा हूँ...' : '🔊 Speaking...')
            : (langCode === 'hi' ? '🎤 सुन रहा हूँ...' : '🎤 Listening...')}
        </div>
      )}
    </div>
  );
}
