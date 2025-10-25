import React from 'react';

const QualityScoresTable = ({ comparison, getScoreColor }) => {
    // Safely access comparison data with fallbacks
    const greedyData = comparison['Greedy Algorithm'] || comparison['greedy'] || {};
    const geneticData = comparison['Genetic Algorithm'] || comparison['genetic'] || {};
    const lpData = comparison['Linear Programming'] || comparison['linear_programming'] || {};
    
    // Check if we have three algorithms or just two
    const hasThreeAlgorithms = Object.keys(lpData).length > 0;
    
    return (
        <div className="comparison-section">
            <h2>Quality Scores Comparison</h2>
            <table className="comparison-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Greedy Algorithm</th>
                        <th>Genetic Algorithm</th>
                        {hasThreeAlgorithms && <th>Linear Programming</th>}
                        <th>Winner</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            Overall Score
                            <span className="info-icon" title="Weighted average of all metrics">ⓘ</span>
                        </td>
                        <td>
                            <span 
                                className="score-badge" 
                                style={{ backgroundColor: getScoreColor(greedyData.overallScore || '0%') }}
                            >
                                {greedyData.overallScore || 'N/A'}
                            </span>
                        </td>
                        <td>
                            <span 
                                className="score-badge" 
                                style={{ backgroundColor: getScoreColor(geneticData.overallScore || '0%') }}
                            >
                                {geneticData.overallScore || 'N/A'}
                            </span>
                        </td>
                        {hasThreeAlgorithms && (
                            <td>
                                <span 
                                    className="score-badge" 
                                    style={{ backgroundColor: getScoreColor(lpData.overallScore || '0%') }}
                                >
                                    {lpData.overallScore || 'N/A'}
                                </span>
                            </td>
                        )}
                        <td>
                            <span className="winner-badge">
                                {comparison.winner || 'N/A'}
                            </span>
                        </td>
                    </tr>
                    {['coverage', 'workloadBalance', 'fairness', 'efficiency'].map((metric) => {
                        const greedyValue = greedyData[metric] || '0';
                        const geneticValue = geneticData[metric] || '0';
                        const lpValue = hasThreeAlgorithms ? (lpData[metric] || '0') : null;
                        
                        // Determine winner for this metric
                        let winner = 'Greedy Algorithm';
                        let bestValue = parseFloat(greedyValue.replace('%', '')) || 0;
                        
                        const geneticValueNum = parseFloat(geneticValue.replace('%', '')) || 0;
                        if (geneticValueNum > bestValue) {
                            winner = 'Genetic Algorithm';
                            bestValue = geneticValueNum;
                        }
                        
                        if (hasThreeAlgorithms) {
                            const lpValueNum = parseFloat(lpValue.replace('%', '')) || 0;
                            if (lpValueNum > bestValue) {
                                winner = 'Linear Programming';
                                bestValue = lpValueNum;
                            }
                        }
                        
                        return (
                            <tr key={metric}>
                                <td>{metric.replace(/([A-Z])/g, ' $1').trim()}</td>
                                <td>{greedyValue}</td>
                                <td>{geneticValue}</td>
                                {hasThreeAlgorithms && <td>{lpValue}</td>}
                                <td>
                                    <span className="winner-badge small">
                                        {winner}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            
            {hasThreeAlgorithms && comparison.improvements && (
                <div className="improvements-section">
                    <h3>Algorithm Improvements</h3>
                    <div className="improvements-grid">
                        <div className="improvement-card">
                            <h4>Genetic vs Greedy</h4>
                            <span className={parseFloat(comparison.improvements['Genetic vs Greedy']) > 0 ? 'positive' : 'negative'}>
                                {comparison.improvements['Genetic vs Greedy']}
                            </span>
                        </div>
                        <div className="improvement-card">
                            <h4>LP vs Greedy</h4>
                            <span className={parseFloat(comparison.improvements['LP vs Greedy']) > 0 ? 'positive' : 'negative'}>
                                {comparison.improvements['LP vs Greedy']}
                            </span>
                        </div>
                        <div className="improvement-card">
                            <h4>LP vs Genetic</h4>
                            <span className={parseFloat(comparison.improvements['LP vs Genetic']) > 0 ? 'positive' : 'negative'}>
                                {comparison.improvements['LP vs Genetic']}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QualityScoresTable; 