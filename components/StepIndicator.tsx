
import React from 'react';
import { OnboardingStep } from '../types';

interface StepIndicatorProps {
  currentStep: OnboardingStep;
}

const steps = [
  { id: OnboardingStep.ENTITY_SELECT, label: "Entity" },
  { id: OnboardingStep.DOC_UPLOAD, label: "Upload" },
  { id: OnboardingStep.REVIEW_VALIDATION, label: "Verify" },
  { id: OnboardingStep.PASSWORD_SETUP, label: "Security" },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  return (
    <div className="flex items-center justify-between w-full max-w-md mx-auto mb-10">
      {steps.map((step, index) => {
        const isActive = currentStep === step.id || (currentStep === OnboardingStep.AI_PROCESSING && step.id === OnboardingStep.DOC_UPLOAD);
        const isCompleted = currentStep > step.id && currentStep !== OnboardingStep.AI_PROCESSING;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center relative">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-green-600 border-green-600 text-white'
                    : isActive
                    ? 'border-blue-600 text-blue-600 font-bold bg-white'
                    : 'border-gray-300 text-gray-400 bg-white'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span className={`text-xs mt-2 absolute -bottom-6 font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-4 bg-gray-200">
                <div
                  className={`h-full bg-green-600 transition-all duration-500 ${
                    isCompleted ? 'w-full' : 'w-0'
                  }`}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
