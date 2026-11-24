type MascotDuoSceneProps = {
  className?: string;
  foreground?: 'dog' | 'cat';
};

export function MascotDuoScene({ className = '', foreground = 'dog' }: MascotDuoSceneProps) {
  return <div
    className={`mascot-duo-scene mascot-duo-${foreground}-front ${className}`.trim()}
    role="img"
    aria-label="PawSpeak’s golden dog and blue cat mascots waving together"
  >
    <img className="mascot-duo-dog" src="/mascots/dog.webp" alt="" decoding="async" />
    <img className="mascot-duo-cat" src="/mascots/cat.webp" alt="" decoding="async" />
  </div>;
}
