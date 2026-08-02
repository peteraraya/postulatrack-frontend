export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface Profile {
  id: string;
  userId: string;
  headline?: string;
  summary?: string;
  skills: string[];
  location?: string;
  experiences: any[];
  educations: any[];
}

export interface JobOffer {
  id: string;
  title: string;
  company: string;
  location?: string;
  isRemote: boolean;
  description: string;
  url: string;
  skills: string[];
  seniority?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
}

export interface Application {
  id: string;
  userId: string;
  offerId: string;
  status: 'SENT' | 'INTERVIEW' | 'REJECTED' | 'OFFER' | 'WITHDRAWN';
  offer?: JobOffer;
  events?: ApplicationEvent[];
  updatedAt: string;
}

export interface ApplicationEvent {
  id: string;
  status: string;
  notes?: string;
  createdAt: string;
}
