/**
 * Conversion Tracking Service
 * 
 * This service handles tracking user conversions and trial management
 * for the accounting dashboard application.
 */

import { trackEvent } from '../utils/analytics';
// Removed unused import

// Define conversion event types
export type ConversionEventType = 
  | 'file_upload'
  | 'dashboard_visit'
  | 'task_started'
  | 'task_completed'
  | 'plan_upgrade'
  | 'trial_started'
  | 'trial_expiring'
  | 'trial_expired';

// Interface for trial information
export interface TrialInfo {
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  daysRemaining: number;
}

class ConversionTrackingService {
  private readonly TRIAL_DURATION_DAYS = 14;
  
  /**
   * Track a conversion event
   */
  trackConversion(eventType: ConversionEventType, data: Record<string, any> = {}, userId?: string) {
    return trackEvent(`conversion_${eventType}`, {
      ...data,
      user_id: userId,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Track file upload event
   */
  trackFileUpload(fileType: string, fileSize: number, userId?: string) {
    return this.trackConversion('file_upload', {
      file_type: fileType,
      file_size: fileSize
    }, userId);
  }
  
  /**
   * Track dashboard visit duration
   */
  trackDashboardVisit(durationSeconds: number, userId?: string) {
    return this.trackConversion('dashboard_visit', {
      duration_seconds: durationSeconds
    }, userId);
  }
  
  /**
   * Track task started
   */
  trackTaskStarted(taskName: string, userId?: string) {
    return this.trackConversion('task_started', {
      task_name: taskName
    }, userId);
  }
  
  /**
   * Track task completed
   */
  trackTaskCompleted(taskName: string, durationSeconds: number, userId?: string) {
    return this.trackConversion('task_completed', {
      task_name: taskName,
      duration_seconds: durationSeconds
    }, userId);
  }
  
  /**
   * Track plan upgrade
   */
  trackPlanUpgrade(fromPlan: string, toPlan: string, userId?: string) {
    return this.trackConversion('plan_upgrade', {
      from_plan: fromPlan,
      to_plan: toPlan
    }, userId);
  }
  
  /**
   * Start a trial for a user
   */
  startTrial(userId: string) {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + this.TRIAL_DURATION_DAYS);
    
    // Store trial info in localStorage for non-authenticated users
    // and as a fallback for authenticated users
    localStorage.setItem('trial_start_date', startDate.toISOString());
    localStorage.setItem('trial_end_date', endDate.toISOString());
    
    // Track trial started event
    this.trackConversion('trial_started', {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      duration_days: this.TRIAL_DURATION_DAYS
    }, userId);
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }
  
  /**
   * Get trial information for a user
   */
  getTrialInfo(): TrialInfo {
    // Get trial dates from localStorage
    const startDateStr = localStorage.getItem('trial_start_date');
    const endDateStr = localStorage.getItem('trial_end_date');
    
    if (!startDateStr || !endDateStr) {
      return {
        isActive: false,
        startDate: null,
        endDate: null,
        daysRemaining: 0
      };
    }
    
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const currentDate = new Date();
    
    // Calculate days remaining
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysRemaining = Math.max(
      0,
      Math.ceil((endDate.getTime() - currentDate.getTime()) / msPerDay)
    );
    
    // Determine if trial is active
    const isActive = currentDate <= endDate && currentDate >= startDate;
    
    return {
      isActive,
      startDate: startDateStr,
      endDate: endDateStr,
      daysRemaining
    };
  }
  
  /**
   * Check if trial is expiring soon (3 days or less)
   */
  isTrialExpiringSoon(): boolean {
    const { isActive, daysRemaining } = this.getTrialInfo();
    return isActive && daysRemaining <= 3;
  }
  
  /**
   * Track trial expiring event (when 3 days or less remaining)
   */
  trackTrialExpiring(userId?: string) {
    const { daysRemaining } = this.getTrialInfo();
    
    return this.trackConversion('trial_expiring', {
      days_remaining: daysRemaining
    }, userId);
  }
  
  /**
   * Track trial expired event
   */
  trackTrialExpired(userId?: string) {
    return this.trackConversion('trial_expired', {}, userId);
  }
}

export const conversionTracking = new ConversionTrackingService();