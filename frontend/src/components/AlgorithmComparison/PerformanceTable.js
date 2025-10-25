import React from 'react';

const PerformanceTable = ({ comparison }) => {
    // Safely access comparison data with fallbacks
    const greedyData = comparison['Greedy Algorithm'] || comparison['greedy'] || {};
    const geneticData = comparison['Genetic Algorithm'] || comparison['genetic'] || {};
    const lpData = comparison['Linear Programming'] || comparison['linear_programming'] || {};
    
    // Check if we have three algorithms or just two
    const hasThreeAlgorithms = Object.keys(lpData).length > 0;
    
    // Extract performance data from each algorithm
    const performance = {
        'Greedy Algorithm': greedyData.performance || {},
        'Genetic Algorithm': geneticData.performance || {},
        'Linear Programming': lpData.performance || {}
    };
    
    return (
        <div className="comparison-section">
            <h2>Performance Metrics</h2>
            <table className="comparison-table">
                <thead>
                    <tr>
                        <th>Algorithm</th>
                        <th>Time (ms)</th>
                        <th>Exams/Second</th>
                        <th>Speed Rank</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Greedy Algorithm</td>
                        <td>{performance['Greedy Algorithm']?.totalTimeMs || 0}</td>
                        <td>{performance['Greedy Algorithm']?.examsPerSecond || 0}</td>
                        <td>
                            <span className="rank-badge">
                                {hasThreeAlgorithms ? 
                                    (performance['Greedy Algorithm']?.totalTimeMs <= performance['Genetic Algorithm']?.totalTimeMs && 
                                     performance['Greedy Algorithm']?.totalTimeMs <= performance['Linear Programming']?.totalTimeMs ? '1st' : 
                                     performance['Greedy Algorithm']?.totalTimeMs <= performance['Genetic Algorithm']?.totalTimeMs || 
                                     performance['Greedy Algorithm']?.totalTimeMs <= performance['Linear Programming']?.totalTimeMs ? '2nd' : '3rd') : 
                                    (performance['Greedy Algorithm']?.totalTimeMs <= performance['Genetic Algorithm']?.totalTimeMs ? '1st' : '2nd')}
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td>Genetic Algorithm</td>
                        <td>{performance['Genetic Algorithm']?.totalTimeMs || 0}</td>
                        <td>{performance['Genetic Algorithm']?.examsPerSecond || 0}</td>
                        <td>
                            <span className="rank-badge">
                                {hasThreeAlgorithms ? 
                                    (performance['Genetic Algorithm']?.totalTimeMs <= performance['Greedy Algorithm']?.totalTimeMs && 
                                     performance['Genetic Algorithm']?.totalTimeMs <= performance['Linear Programming']?.totalTimeMs ? '1st' : 
                                     performance['Genetic Algorithm']?.totalTimeMs <= performance['Greedy Algorithm']?.totalTimeMs || 
                                     performance['Genetic Algorithm']?.totalTimeMs <= performance['Linear Programming']?.totalTimeMs ? '2nd' : '3rd') : 
                                    (performance['Genetic Algorithm']?.totalTimeMs <= performance['Greedy Algorithm']?.totalTimeMs ? '1st' : '2nd')}
                            </span>
                        </td>
                    </tr>
                    {hasThreeAlgorithms && (
                        <tr>
                            <td>Linear Programming</td>
                            <td>{performance['Linear Programming']?.totalTimeMs || 0}</td>
                            <td>{performance['Linear Programming']?.examsPerSecond || 0}</td>
                            <td>
                                <span className="rank-badge">
                                    {performance['Linear Programming']?.totalTimeMs <= performance['Greedy Algorithm']?.totalTimeMs && 
                                     performance['Linear Programming']?.totalTimeMs <= performance['Genetic Algorithm']?.totalTimeMs ? '1st' : 
                                     performance['Linear Programming']?.totalTimeMs <= performance['Greedy Algorithm']?.totalTimeMs || 
                                     performance['Linear Programming']?.totalTimeMs <= performance['Genetic Algorithm']?.totalTimeMs ? '2nd' : '3rd'}
                                </span>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            
            {hasThreeAlgorithms && comparison.speedComparison && (
                <div className="speed-comparison-section">
                    <h3>Speed Comparisons</h3>
                    <div className="speed-comparisons-grid">
                        <div className="speed-card">
                            <h4>Genetic vs Greedy</h4>
                            <span className="speed-badge">
                                {comparison.speedComparison['Genetic vs Greedy']}
                            </span>
                        </div>
                        <div className="speed-card">
                            <h4>LP vs Greedy</h4>
                            <span className="speed-badge">
                                {comparison.speedComparison['LP vs Greedy']}
                            </span>
                        </div>
                        <div className="speed-card">
                            <h4>LP vs Genetic</h4>
                            <span className="speed-badge">
                                {comparison.speedComparison['LP vs Genetic']}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerformanceTable; 