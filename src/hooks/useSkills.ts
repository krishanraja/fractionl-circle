import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Skill = Database['public']['Tables']['skills']['Row'];

export interface SkillsByCategory {
  [category: string]: Skill[];
}

export const useSkills = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsByCategory, setSkillsByCategory] = useState<SkillsByCategory>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all skills
  const fetchSkills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('skills')
        .select('*')
        .order('category')
        .order('name');

      if (fetchError) throw fetchError;

      setSkills(data || []);

      // Group by category
      const grouped = (data || []).reduce((acc: SkillsByCategory, skill) => {
        if (!acc[skill.category]) {
          acc[skill.category] = [];
        }
        acc[skill.category].push(skill);
        return acc;
      }, {});

      setSkillsByCategory(grouped);
    } catch (err) {
      console.error('Error fetching skills:', err);
      setError(err instanceof Error ? err.message : String(err));
      toast.error('Failed to load skills');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // Get skill by ID
  const getSkillById = useCallback((id: string): Skill | undefined => {
    return skills.find(skill => skill.id === id);
  }, [skills]);

  // Get skills by category
  const getSkillsByCategory = useCallback((category: string): Skill[] => {
    return skillsByCategory[category] || [];
  }, [skillsByCategory]);

  // Get all categories
  const getCategories = useCallback((): string[] => {
    return Object.keys(skillsByCategory).sort();
  }, [skillsByCategory]);

  // Search skills
  const searchSkills = useCallback((query: string): Skill[] => {
    const lowerQuery = query.toLowerCase();
    return skills.filter(skill =>
      skill.name.toLowerCase().includes(lowerQuery) ||
      skill.category.toLowerCase().includes(lowerQuery) ||
      skill.description?.toLowerCase().includes(lowerQuery)
    );
  }, [skills]);

  return {
    skills,
    skillsByCategory,
    loading,
    error,
    getSkillById,
    getSkillsByCategory,
    getCategories,
    searchSkills,
    refetch: fetchSkills
  };
};
