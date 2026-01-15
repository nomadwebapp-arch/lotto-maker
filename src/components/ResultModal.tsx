import { GeneratedNumbers } from '../types/lottery';
import { getBallColor } from '../utils/numberGenerator';
import './ResultModal.css';

interface ResultModalProps {
  numbers: GeneratedNumbers;
  onClose: () => void;
  onReset: () => void;
  onShare: () => void;
}

const ResultModal = ({ numbers, onClose, onReset, onShare }: ResultModalProps) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">🎉 추첨 결과</h2>

        <div className="result-section">
          <h3>당첨 번호</h3>
          <div className="result-numbers">
            {numbers.mainNumbers.map((num, index) => (
              <div
                key={index}
                className="result-ball"
                style={{ backgroundColor: getBallColor(num) }}
              >
                {num}
              </div>
            ))}
          </div>
        </div>

        {numbers.bonusNumbers && numbers.bonusNumbers.length > 0 && (
          <div className="result-section">
            <h3>보너스 번호</h3>
            <div className="result-numbers">
              {numbers.bonusNumbers.map((num, index) => (
                <div
                  key={index}
                  className="result-ball bonus"
                  style={{ backgroundColor: getBallColor(num) }}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-buttons">
          <button className="modal-button reset-btn" onClick={onReset}>
            🔄 다시 뽑기
          </button>
          <button className="modal-button share-btn" onClick={onShare}>
            📤 공유하기
          </button>
          <button className="modal-button close-btn" onClick={onClose}>
            ✖ 닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultModal;
