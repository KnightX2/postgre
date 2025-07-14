import React, { useState } from 'react';
import { 
    FaRandom, 
    FaDna, 
    FaTimes,
    FaChartLine 
} from 'react-icons/fa';
import './DistributionOptionsModal.scss';

const DistributionOptionsModal = ({ schedule, onClose, onSelectAlgorithm }) => {
    const [selectedAlgorithm, setSelectedAlgorithm] = useState(null);
    const [gaParams, setGaParams] = useState({
        populationSize: 50,
        generations: 30,
        mutationRate: 0.1,
        crossoverRate: 0.7,
        elitismRate: 0.1
    });
    const [showParamForm, setShowParamForm] = useState(false);

    const distributionAlgorithms = [
        {
            id: 'random',
            name: 'Random Distribution',
            description: 'Randomly assign observers with basic constraints',
            icon: <FaRandom />,
            constraints: [
                'Head Observer: Must be Dr. with observer role',
                'Secretary: Any observer',
                'Ensures random but rule-based assignment'
            ]
        },
        {
            id: 'genetic',
            name: 'Genetic Algorithm Distribution',
            description: 'Optimize observer assignments using evolutionary techniques',
            icon: <FaDna />,
            constraints: [
                'Considers observer expertise and availability',
                'Minimizes conflicts and maximizes efficiency',
                'Iteratively improves assignment quality'
            ]
        },
        {
            id: 'compare',
            name: 'Compare & Apply Best',
            description: 'Run both algorithms, compare results, and apply the best one',
            icon: <FaChartLine />,
            constraints: [
                'Runs both Random and Genetic algorithms',
                'Compares quality metrics and performance',
                'Automatically applies the better result',
                'Shows detailed comparison report'
            ]
        }
    ];

    const handleAlgorithmClick = (algorithm) => {
        setSelectedAlgorithm(algorithm.id);
        if (algorithm.id === 'genetic') {
            setShowParamForm(true);
        } else {
            onSelectAlgorithm(algorithm.id);
        }
    };

    const handleParamChange = (e) => {
        const { name, value } = e.target;
        setGaParams(prev => ({
            ...prev,
            [name]: name.includes('Rate') ? parseFloat(value) : parseInt(value, 10)
        }));
    };

    const handleRunGenetic = () => {
        onSelectAlgorithm('genetic', gaParams);
        setShowParamForm(false);
    };

    return (
        <div className="distribution-options-modal-overlay">
            <div className="distribution-options-modal">
                <div className="modal-header">
                    <h2>Distribution Algorithms</h2>
                    <button className="close-btn" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>
                
                <div className="modal-content">
                    <p className="schedule-info">
                        Schedule: {schedule.academicYear} - {schedule.semester} {schedule.examType}
                    </p>
                    <p className="schedule-exams-info">
                        Total Exams: {schedule.totalExams} | Unassigned: {schedule.totalExams - schedule.assignedExams}
                    </p>

                    <div className="distribution-algorithms">
                        {distributionAlgorithms.map((algorithm) => (
                            <div 
                                key={algorithm.id} 
                                className={`algorithm-option${selectedAlgorithm === algorithm.id ? ' selected' : ''}`}
                                onClick={() => handleAlgorithmClick(algorithm)}
                            >
                                <div className="algorithm-icon">{algorithm.icon}</div>
                                <div className="algorithm-details">
                                    <h3>{algorithm.name}</h3>
                                    <p>{algorithm.description}</p>
                                    <div className="algorithm-constraints">
                                        <strong>Constraints:</strong>
                                        <ul>
                                            {algorithm.constraints.map((constraint, index) => (
                                                <li key={index}>{constraint}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {showParamForm && (
                        <div className="ga-params-form">
                            <h4>Genetic Algorithm Parameters</h4>
                            <form onSubmit={e => { e.preventDefault(); handleRunGenetic(); }}>
                                <label>
                                    Population Size:
                                    <input type="number" name="populationSize" min="10" max="200" value={gaParams.populationSize} onChange={handleParamChange} required />
                                </label>
                                <label>
                                    Generations:
                                    <input type="number" name="generations" min="10" max="500" value={gaParams.generations} onChange={handleParamChange} required />
                                </label>
                                <label>
                                    Mutation Rate:
                                    <input type="number" name="mutationRate" min="0" max="1" step="0.01" value={gaParams.mutationRate} onChange={handleParamChange} required />
                                </label>
                                <label>
                                    Crossover Rate:
                                    <input type="number" name="crossoverRate" min="0" max="1" step="0.01" value={gaParams.crossoverRate} onChange={handleParamChange} required />
                                </label>
                                <label>
                                    Elitism Rate:
                                    <input type="number" name="elitismRate" min="0" max="1" step="0.01" value={gaParams.elitismRate} onChange={handleParamChange} required />
                                </label>
                                <div className="form-actions">
                                    <button type="submit">Run Genetic Algorithm</button>
                                    <button type="button" onClick={() => setShowParamForm(false)}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DistributionOptionsModal; 