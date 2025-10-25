import React from 'react';

const SummaryCards = ({ comparison }) => {
    // Safely access comparison data with fallbacks
    const greedyData = comparison['Greedy Algorithm'] || comparison['greedy'] || {};
    const geneticData = comparison['Genetic Algorithm'] || comparison['genetic'] || {};
    const lpData = comparison['Linear Programming'] || comparison['linear_programming'] || {};
    
    const greedyOverall = greedyData.overallScore || '0%';
    const geneticOverall = geneticData.overallScore || '0%';
    const hasThreeAlgorithms = Object.keys(lpData).length > 0;
    const lpOverall = hasThreeAlgorithms ? (lpData.overallScore || '0%') : null;
    
    // Determine the best score for highlighting
    const scores = [parseFloat(greedyOverall.replace('%', '')), parseFloat(geneticOverall.replace('%', ''))];
    if (hasThreeAlgorithms) scores.push(parseFloat(lpOverall.replace('%', '')));
    const bestScore = Math.max(...scores);

    return (
        <div className="summary-cards">
            <div className="summary-card">
                <h3>Greedy Algorithm</h3>
                <div className={`card-value ${parseFloat(greedyOverall.replace('%', '')) === bestScore ? 'highlight' : ''}`}>
                    {greedyOverall}
                </div>
                <div className="card-subtitle">Overall Score</div>
                <div className="card-grade">{greedyData.grade || 'N/A'}</div>
            </div>
            
            <div className="summary-card">
                <h3>Genetic Algorithm</h3>
                <div className={`card-value ${parseFloat(geneticOverall.replace('%', '')) === bestScore ? 'highlight' : ''}`}>
                    {geneticOverall}
                </div>
                <div className="card-subtitle">Overall Score</div>
                <div className="card-grade">{geneticData.grade || 'N/A'}</div>
            </div>
            
            {hasThreeAlgorithms && (
                <div className="summary-card">
                    <h3>Linear Programming</h3>
                    <div className={`card-value ${parseFloat(lpOverall.replace('%', '')) === bestScore ? 'highlight' : ''}`}>
                        {lpOverall}
                    </div>
                    <div className="card-subtitle">Overall Score</div>
                    <div className="card-grade">{lpData.grade || 'N/A'}</div>
                </div>
            )}
            
            <div className="summary-card winner">
                <h3>Winner</h3>
                <div className="card-value winner-value">
                    {comparison.winner || 'N/A'}
                </div>
                <div className="card-subtitle">Best Algorithm</div>
                {comparison.summary && comparison.summary.recommendation && (
                    <div className="card-recommendation">
                        {comparison.summary.recommendation}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SummaryCards; 