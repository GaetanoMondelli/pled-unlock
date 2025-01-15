import React, { useEffect, useState } from 'react';
import { machine_to_svg_string } from 'jssm-viz';
import { sm } from 'jssm';

interface StateGraphProps {
  definition: string;
  currentState: string;
}

const StateGraph: React.FC<StateGraphProps> = ({ definition, currentState }: StateGraphProps) => {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    const generateSvg = async () => {
      const newStyle = `state ${currentState} : { background-color: green;  corners: rounded; };`;
      const svgData = await machine_to_svg_string(sm`${definition.trim()} \n ${newStyle}`);
      setSvg(svgData);
    };

    generateSvg();
  }, [definition, currentState]);

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
