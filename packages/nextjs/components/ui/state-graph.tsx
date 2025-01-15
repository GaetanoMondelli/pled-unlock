import React, { useEffect, useState } from 'react';
import { dot_to_svg } from 'jssm-viz';

interface StateGraphProps {
  stateMachine: any; // Adjust the type based on your state machine definition
}

const StateGraph: React.FC<StateGraphProps> = ({ stateMachine }) => {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    const generateSvg = async () => {
      const svgData = await dot_to_svg(
        `digraph StateMachine {
          idle -> processing [label="start"];
          processing -> success [label="complete"];
          processing -> failure [label="fail"];
          success -> idle [label="reset"];
          failure -> idle [label="retry"];
        }`
      );
      setSvg(svgData);
    };

    generateSvg();
  }, [stateMachine]);

  return (
    <div>
      {svg ? (
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default StateGraph;
