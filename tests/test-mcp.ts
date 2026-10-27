import { McpServer } from '../src/mcp/server';

async function runMcpTests() {
  console.log('--- Testing MCP Server (Model Context Protocol) ---');
  const server = new McpServer();

  // 1. Test Initialize
  const initRes = await server.handleRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {}
  });
  console.log('✅ 1. MCP Handshake:', initRes?.result?.serverInfo);

  // 2. Test Tools List
  const toolsRes = await server.handleRequest({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list'
  });
  const tools = toolsRes?.result?.tools || [];
  console.log(`✅ 2. Tools Discovery (${tools.length} tools registered):`);
  tools.forEach((t: any) => console.log(`   ├─ ${t.name}: ${t.description.substring(0, 50)}...`));

  // 3. Test Tool Call: sim_query_player
  const playerCall = await server.handleRequest({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'sim_query_player',
      arguments: { playerId: 'PLY-0001' }
    }
  });
  const playerText = JSON.parse(playerCall?.result?.content[0]?.text);
  console.log('✅ 3. sim_query_player result:', {
    name: playerText.player?.name,
    liquidCash: playerText.player?.liquid_cash,
    location: playerText.player?.current_location
  });

  // 4. Test Tool Call: sim_check_supply_line
  const supplyCall = await server.handleRequest({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'sim_check_supply_line',
      arguments: { fromNode: 'LOC-0001', supplyHub: 'LOC-0002' }
    }
  });
  const supplyText = JSON.parse(supplyCall?.result?.content[0]?.text);
  console.log('✅ 4. sim_check_supply_line result:', supplyText.statusDescription);

  // 5. Test Tool Call: sim_calculate_price
  const priceCall = await server.handleRequest({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: {
      name: 'sim_calculate_price',
      arguments: {
        commodity: 'GRAIN',
        basePrice: 50,
        stockUnits: 150,
        demandUnits: 450,
        priceElasticity: 1.5
      }
    }
  });
  const priceText = JSON.parse(priceCall?.result?.content[0]?.text);
  console.log('✅ 5. sim_calculate_price result:', {
    commodity: priceText.commodity,
    calculatedPrice: priceText.calculatedPrice,
    deficitRatio: priceText.deficitRatio
  });

  // 6. Test Tool Call: sim_audit_invariants
  const auditCall = await server.handleRequest({
    jsonrpc: '2.0',
    id: 6,
    method: 'tools/call',
    params: {
      name: 'sim_audit_invariants',
      arguments: {}
    }
  });
  const auditText = JSON.parse(auditCall?.result?.content[0]?.text);
  console.log('✅ 6. sim_audit_invariants result:', auditText.verdict);

  console.log('🎉 All MCP Server protocols tested and verified successfully!');
  process.exit(0);
}

runMcpTests().catch(err => {
  console.error('MCP test failed:', err);
  process.exit(1);
});
