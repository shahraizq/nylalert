import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { logger } from './logger.js';

export class TransactionAnalyzer {
  constructor(mintAddress) {
    this.mintAddress = mintAddress;
  }

  async analyzeTransaction(connection, signature) {
    try {
      const tx = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0
      });
      
      if (!tx || !tx.meta) return null;

      const tokenTransfers = this.extractTokenTransfers(tx);
      const nylaTransfers = tokenTransfers.filter(
        transfer => transfer.mint === this.mintAddress
      );

      if (nylaTransfers.length === 0) return null;

      // Only process DEX transactions
      if (!this.isDexTransaction(tx)) {
        logger.debug(`Transaction ${signature} is not a DEX trade, skipping`);
        return null;
      }

      // Find the largest transfer (main trade)
      const largestTransfer = nylaTransfers.reduce((prev, current) => 
        current.amount > prev.amount ? current : prev
      );

      // Determine net effect of the transaction
      const netEffect = this.determineNetEffect(tx, nylaTransfers);
      
      if (!netEffect) return null;

      // Return single transaction analysis
      return [{
        type: netEffect.type,
        amount: largestTransfer.amount,
        from: netEffect.from,
        to: netEffect.to,
        signature,
        timestamp: tx.blockTime ? new Date(tx.blockTime * 1000) : new Date(),
        fee: tx.meta.fee / 1e9
      }];
    } catch (error) {
      logger.error(`Error analyzing transaction ${signature}:`, error);
      return null;
    }
  }

  extractTokenTransfers(tx) {
    const transfers = [];
    
    if (!tx.meta.postTokenBalances || !tx.meta.preTokenBalances) return transfers;

    const postBalances = tx.meta.postTokenBalances;
    const preBalances = tx.meta.preTokenBalances;

    for (const postBalance of postBalances) {
      const preBalance = preBalances.find(
        pre => pre.accountIndex === postBalance.accountIndex
      );

      if (postBalance.mint === this.mintAddress) {
        const preAmount = preBalance ? parseFloat(preBalance.uiTokenAmount.uiAmountString) : 0;
        const postAmount = parseFloat(postBalance.uiTokenAmount.uiAmountString);
        const difference = postAmount - preAmount;

        if (difference !== 0) {
          transfers.push({
            mint: postBalance.mint,
            amount: Math.abs(difference),
            source: difference < 0 ? postBalance.owner : null,
            destination: difference > 0 ? postBalance.owner : null,
            accountIndex: postBalance.accountIndex
          });
        }
      }
    }

    return transfers;
  }

  determineTransactionType(transfer, tx) {
    const instructions = tx.transaction.message.instructions;
    
    // Look for swap instructions
    for (const instruction of instructions) {
      const programId = instruction.programId.toBase58();
      
      // Check for known DEX programs
      const isDex = programId.includes('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc') || // Orca
                   programId.includes('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8') || // Raydium V4
                   programId.includes('5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1') || // Raydium V5
                   programId.includes('JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB') || // Jupiter
                   programId.includes('pump') || // Pump.fun
                   instruction.parsed?.type === 'swap';
      
      if (isDex) {
        // For swaps, check if Nyla is being bought or sold
        // If user receives Nyla = BUY, if user sends Nyla = SELL
        const innerInstructions = tx.meta?.innerInstructions || [];
        for (const inner of innerInstructions) {
          for (const ix of inner.instructions) {
            if (ix.parsed?.type === 'transfer' && ix.parsed?.info?.mint === this.mintAddress) {
              // Check the direction of the transfer
              const authority = ix.parsed.info.authority;
              const source = ix.parsed.info.source;
              const destination = ix.parsed.info.destination;
              
              // If transfer is TO a user wallet (not a pool), it's a BUY
              // If transfer is FROM a user wallet (not a pool), it's a SELL
              return transfer.destination ? 'BUY' : 'SELL';
            }
          }
        }
      }
    }
    
    // Default logic based on balance changes
    return transfer.destination ? 'BUY' : 'SELL';
  }

  isDexTransaction(tx) {
    const instructions = tx.transaction.message.instructions;
    
    for (const instruction of instructions) {
      const programId = instruction.programId.toBase58();
      
      // Check for known DEX programs
      const dexPrograms = [
        'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Orca
        '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium V4
        '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1', // Raydium V5
        'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB', // Jupiter V4
        'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter V6
        'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK', // Raydium CPMM
        '27haf8L6oxUeXrHrgEgsexjSY5hbVUWEmvv9Nyxg8vQv', // Raydium Stable
        'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C', // Raydium CLMM
        '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', // Pump.fun
        'rFqFJ9g7TGBD8Ed7TPDnvGKZ5pWLPDyxLcvcH2eRCtt' // Pump.fun bonding curve
      ];
      
      if (dexPrograms.some(dex => programId.includes(dex)) || 
          instruction.parsed?.type === 'swap') {
        return true;
      }
    }
    
    return false;
  }

  determineNetEffect(tx, nylaTransfers) {
    // Look for SOL/USDC movement to determine if it's a buy or sell
    const accounts = tx.transaction.message.accountKeys;
    const postBalances = tx.meta.postBalances;
    const preBalances = tx.meta.preBalances;
    
    // Find the signer (user initiating the trade)
    const signerIndex = accounts.findIndex(account => account.signer);
    if (signerIndex === -1) return null;
    
    const signer = accounts[signerIndex].pubkey.toBase58();
    
    // Check SOL balance change for the signer
    const solChange = postBalances[signerIndex] - preBalances[signerIndex];
    
    // Find Nyla balance changes for the signer
    let nylaReceived = 0;
    let nylaSent = 0;
    
    for (const transfer of nylaTransfers) {
      if (transfer.destination === signer) {
        nylaReceived += transfer.amount;
      }
      if (transfer.source === signer) {
        nylaSent += transfer.amount;
      }
    }
    
    const netNylaChange = nylaReceived - nylaSent;
    
    // Determine transaction type based on net changes
    if (netNylaChange > 0) {
      // User received Nyla = BUY
      return {
        type: 'BUY',
        from: 'Market',
        to: signer
      };
    } else if (netNylaChange < 0) {
      // User sent Nyla = SELL
      return {
        type: 'SELL',
        from: signer,
        to: 'Market'
      };
    }
    
    // If no net change for signer, look at the largest transfer
    const largestTransfer = nylaTransfers[0];
    return {
      type: largestTransfer.destination ? 'BUY' : 'SELL',
      from: largestTransfer.source || 'Unknown',
      to: largestTransfer.destination || 'Unknown'
    };
  }
}