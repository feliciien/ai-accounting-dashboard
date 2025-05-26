import { Analytics, logEvent, setUserProperties } from 'firebase/analytics';
import { getFirebaseAnalytics } from '../lib/firebase';

interface ExperimentVariant {
  id: string;
  name: string;
  weight: number;
}

interface ExperimentConfig {
  id: string;
  name: string;
  variants: ExperimentVariant[];
  startDate: Date;
  endDate?: Date;
}

class AnalyticsService {
  private analytics: Analytics;
  private activeExperiments: Map<string, string> = new Map(); // experimentId -> variantId

  constructor() {
    this.analytics = getFirebaseAnalytics();
  }

  // Track user interactions
  trackInteraction(eventName: string, properties: Record<string, any> = {}) {
    logEvent(this.analytics, eventName, {
      ...properties,
      timestamp: new Date().toISOString(),
    });
  }

  // Track feature usage
  trackFeatureUsage(featureName: string, action: string, metadata: Record<string, any> = {}) {
    logEvent(this.analytics, 'feature_interaction', {
      feature_name: featureName,
      action,
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }

  // Track user preferences
  trackPreferenceUpdate(preferenceName: string, value: any) {
    logEvent(this.analytics, 'preference_update', {
      preference_name: preferenceName,
      value: JSON.stringify(value),
      timestamp: new Date().toISOString(),
    });
  }

  // Track achievement progress
  trackAchievementProgress(achievementId: string, progress: number, completed: boolean) {
    logEvent(this.analytics, 'achievement_progress', {
      achievement_id: achievementId,
      progress,
      completed,
      timestamp: new Date().toISOString(),
    });
  }

  // Track tutorial completion
  trackTutorialProgress(tutorialId: string, completed: boolean) {
    logEvent(this.analytics, 'tutorial_progress', {
      tutorial_id: tutorialId,
      completed,
      timestamp: new Date().toISOString(),
    });
  }

  // A/B Testing
  assignExperimentVariant(experiment: ExperimentConfig): string {
    // Check if user is already assigned to a variant
    const existingVariant = this.activeExperiments.get(experiment.id);
    if (existingVariant) return existingVariant;

    // Check if experiment is active
    const now = new Date();
    if (now < experiment.startDate || (experiment.endDate && now > experiment.endDate)) {
      return 'control';
    }

    // Randomly assign variant based on weights
    const totalWeight = experiment.variants.reduce((sum, variant) => sum + variant.weight, 0);
    let random = Math.random() * totalWeight;

    for (const variant of experiment.variants) {
      random -= variant.weight;
      if (random <= 0) {
        this.activeExperiments.set(experiment.id, variant.id);
        
        // Track experiment assignment
        logEvent(this.analytics, 'experiment_assignment', {
          experiment_id: experiment.id,
          experiment_name: experiment.name,
          variant_id: variant.id,
          variant_name: variant.name,
          timestamp: new Date().toISOString(),
        });

        return variant.id;
      }
    }

    return 'control';
  }

  // Track experiment conversion
  trackExperimentConversion(experimentId: string, conversionType: string, value?: number) {
    const variantId = this.activeExperiments.get(experimentId);
    if (!variantId) return;

    logEvent(this.analytics, 'experiment_conversion', {
      experiment_id: experimentId,
      variant_id: variantId,
      conversion_type: conversionType,
      value,
      timestamp: new Date().toISOString(),
    });
  }

  // Set user properties for segmentation
  setUserProperties(properties: Record<string, any>) {
    setUserProperties(this.analytics, properties);
  }

  // Track performance metrics
  trackPerformanceMetric(metricName: string, value: number, metadata: Record<string, any> = {}) {
    logEvent(this.analytics, 'performance_metric', {
      metric_name: metricName,
      value,
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }

  // Track error events
  trackError(errorType: string, error: Error, metadata: Record<string, any> = {}) {
    logEvent(this.analytics, 'error_occurred', {
      error_type: errorType,
      error_message: error.message,
      error_stack: error.stack,
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();