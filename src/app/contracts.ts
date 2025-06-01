// src/app/contracts.ts

// !!!!! FONTOS !!!!!
// Ellenőrizd és frissítsd ezeket az értékeket a saját deployolt contractod címeivel és a helyes hálózati ID-val!
export const CLANKER_TOKEN_ADDRESS = "0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07"; // A Clanker token címe
export const GAME_CONTRACT_ADDRESS = "IDE_JÖN_A_DEPLOYOLT_GAME_CONTRACT_CÍME"; // CSERÉLD LE A SAJÁT DEPLOYOLT GAME CONTRACTOD CÍMÉRE!

// Standard ERC20 ABI (minimális szükséges függvények)
export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];

// A GameContract ABI-ja (a megbeszélt pszeudo-kód és funkciók alapján)
// !!!!! FONTOS !!!!!
// Ennek pontosan meg kell egyeznie a deployolt GameContractod ABI-jával!
export const GAME_CONTRACT_ABI = [
  "function stakeAndStartGame() external returns (uint256 gameId)",
  "function reportResultAndPayout(uint256 gameId, address winner) external",
  "function buyExtraGames(uint256 _numberOfGames) external",
  "function stakeAmount() external view returns (uint256)",
  "function getPurchasedExtraGames(address _player) external view returns (uint256)",
  "function getPricePerExtraGame() external view returns (uint256)",
  "event GameStarted(uint256 indexed gameId, address indexed player, uint256 amountStaked)",
  "event GameEnded(uint256 indexed gameId, address winner, uint256 payoutAmount)",
  "event ExtraGamesPurchased(address indexed player, uint256 numberOfGames, uint256 totalCost)",
];

export const TARGET_CHAIN_ID = 8453; 
export const TARGET_CHAIN_ID_HEX = "0x" + TARGET_CHAIN_ID.toString(16); 

export const DAILY_FREE_GAMES_LIMIT = 1;