import { useEffect, useState } from 'react';

interface Meteor {
  id: number;
  left: string;
  animationDelay: string;
  animationDuration: string;
}

const DataMeteors = () => {
  const [meteors, setMeteors] = useState<Meteor[]>([]);

  useEffect(() => {
    // Generate 20 random meteors
    const generatedMeteors = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 5}s`,
      animationDuration: `${2 + Math.random() * 8}s`, // 2-10s
    }));
    setMeteors(generatedMeteors);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {meteors.map((meteor) => (
        <span
          key={meteor.id}
          className="absolute h-px w-[50px]"
          style={{
            left: meteor.left,
            top: '-10px',
            animationName: 'meteor',
            animationDelay: meteor.animationDelay,
            animationDuration: meteor.animationDuration,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'linear',
            background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%)',
          }}
        />
      ))}
    </div>
  );
};

export default DataMeteors;
