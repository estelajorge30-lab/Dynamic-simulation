
import { GoogleGenAI } from "@google/genai";
import { CaseData, DiagnosisType } from "../types";

const getSystemInstruction = () => `
You are a Senior Respiratory Physiologist using the National Asthma Council Australia guidelines.
Your task is to interpret spirometry data for a medical student.
Be precise, clinical, and educational.
Always reference the FEV1/FVC ratio and % Predicted values.
Use the severity grading: Mild (60-80%), Moderate (40-59%), Severe (<40%).
Structure the response as:
1. Impression (Diagnosis & Severity)
2. Justification (Flow loop shape + Key values)
3. Clinical Correlation (Possible causes)
`;

export const analyzeSpirometry = async (
  caseData: CaseData
): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return "API Key is missing.";
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      Patient: ${caseData.demographics.age}yo ${caseData.demographics.sex}, Height: ${caseData.demographics.height}cm.
      
      MEASURED VALUES:
      FVC: ${caseData.actual.fvc.toFixed(2)} L (${((caseData.actual.fvc / caseData.predicted.fvcPred)*100).toFixed(0)}% Pred)
      FEV1: ${caseData.actual.fev1.toFixed(2)} L (${((caseData.actual.fev1 / caseData.predicted.fev1Pred)*100).toFixed(0)}% Pred)
      FEV1/FVC Ratio: ${caseData.actual.ratio.toFixed(2)} (LLN: ${caseData.predicted.ratioLLN})
      PEF: ${caseData.actual.pef.toFixed(1)} L/s
      
      PREDICTED VALUES (GLI-2012):
      FVC: ${caseData.predicted.fvcPred.toFixed(2)}
      FEV1: ${caseData.predicted.fev1Pred.toFixed(2)}
      
      DIAGNOSIS CONTEXT: ${caseData.diagnosis} (${caseData.severity})
      
      Please provide a formal clinical report.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(),
      }
    });

    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Clinical analysis unavailable. Please check API configuration.";
  }
};
