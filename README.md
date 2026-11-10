# Oficina 3D — Simulador de Usinagem, Galeria e Modelos

Projeto web educacional em HTML, CSS, JavaScript e Three.js com exploração em primeira pessoa, operações didáticas de torno/fresadora, compatibilidade WebXR e biblioteca de imagens.

## Novidades desta versão
- **Boneco em blocos:** o operador agora é feito de cubos, no estilo voxel: cabeça quadrada com rosto em pixels, macacão azul, colete laranja com faixas refletivas, capacete amarelo, luvas, botas com biqueira e mochila. Os óculos e o protetor auricular aparecem no boneco quando você está com eles.
- **Agachar novo (C):** o corpo inclina para a frente, a cabeça continua olhando para frente e as pernas ficam para trás, igual ao "agachar" dos jogos de blocos. Andando agachado, o passo fica curto.
- **EPI com E (pegar e guardar):** na mesa de EPI da entrada, mire na mesa (ou nos EPIs) e aperte **E** para pegar óculos e protetor auricular de uma vez. Perto da mesa, apertar **E** de novo guarda os dois de volta na mesa (com as máquinas desligadas). A tecla **G** continua tirando e colocando o EPI sem devolver.
- **Janela de ferramentas na tecla " (aspas):** aperte **"** (ou o botão **🔧 FERRAMENTAS (")** na tela) para abrir e fechar a janela com todas as ferramentas. Abre já na ferramenta que está selecionada na mochila ou instalada na máquina.
- **Torre do torno começa vazia:** todas as ferramentas do torno (tornear, mandrilar, canal, facear, rosca e bedame) começam no armário. Pegue uma no armário e instale (E perto do torno, botão ⇄ ou **＋ Instalar** no painel); ela vai para a posição da torre virada para a peça.
- **PDF com 6 páginas:** a nova página 6 mostra como o programa foi feito e quais ferramentas foram usadas.
- **E pega e guarda no lugar:** com um item selecionado na mochila, chegue perto do lugar de onde ele saiu e aperte **E**: ferramenta do armário volta para o armário, cilindro/bloco volta para a bancada de materiais e peça pronta volta para a caixinha. Mirando em outro item, o E continua pegando. Ferramenta que saiu da torre volta para a mesma posição da torre (E perto do torno ou botão ⇄).
- **Botão RPM +:** ao lado do botão amarelo (RPM −) agora tem um botão azul **RPM +**, no torno e na fresadora. Os dois têm o sinal "+" e "−" na tampa, e no torno cada botão ganhou uma etiqueta (LIGA, RPM −, RPM +, USINAR).
- **Ferramentas do torno no armário:** a bandeja do armário tem lugar para as 6 ferramentas de torno. Além das três que começam na torre (tornear, mandrilar e canal), o armário traz a ferramenta de facear, a de rosca 60° e o bedame de sangrar. Dá para montar qualquer uma na posição livre da torre (T4).
- **Ver torre vai e volta:** o botão **🔍 VER TORRE** vira **↩ VOLTAR** e leva de volta para a vista de antes (primeira pessoa ou a câmera que você estava usando).
- **Tela cheia:** **F11** coloca o jogo em tela cheia e **Esc** (ou F11 de novo) sai, sem abrir o menu de pausa junto.
- O arquivo `maquina.skp` e a pasta `assets/modelos` foram removidos do projeto.
- **Mesmo botão para pegar e guardar:** na torre do torno, o botão **⇄ (Y)** pega a ferramenta da posição ativa. Gire a torre e aperte de novo para pegar outra (dá para pegar várias). Quando a posição ativa estiver vazia, o mesmo botão guarda **todas** as ferramentas do torno que estão na mochila, cada uma na sua posição (T1, T2, T3). O texto do botão mostra o que vai acontecer ("PEGAR FERRAMENTA T2" ou "GUARDAR 2 FERRAMENTAS").
- **Cavaco não fica mais no ar:** na fresadora, o cavaco pousa na superfície que está de verdade embaixo dele (peça, morsa, mesa, carro ou joelho). Se não tiver nada embaixo, ele cai até o chão. Se a peça sair ou a mesa mudar de altura, o cavaco parado cai junto.
- **Indicador de EPI legível:** "ÓCULOS" e "PROTETOR AURICULAR" agora aparecem em letra branca maior, com uma bolinha verde (colocado) ou vermelha (sem EPI), sem quebrar a linha.
- **Menos lag:** as peças fixas da sala e das máquinas foram juntadas em poucos objetos (de ~940 para ~600 desenhos por quadro), as luzes pontuais do teto viraram luz ambiente equivalente e peças pequenas (parafusos, botões) não projetam mais sombra.
- **Torre de ferramentas do torno:** o porta-ferramentas achatado virou uma torre amarela de 4 posições (**T1 a T4**), maior e bem visível em cima do carro, com as ferramentas montadas: T1 torneamento, T2 barra de mandrilar, T3 canal e T4 livre. A posição virada para a peça (seta vermelha, etiqueta verde) é a ferramenta em uso. Clique na alavanca vermelha (ou **↻ Girar torre** no painel) para girar 90°.
- **Pegar / Guardar no mesmo lugar:** botão **⇄ PEGAR FERRAMENTA (Y)** na tela (aparece perto do torno), botão **⇄ Pegar/Guardar ferramenta** no painel, tecla **Y**, clique no cabeçote ou mirar e **E**. Tira a ferramenta da posição ativa para a mochila; apertando de novo ela volta para a mesma posição da torre e já fica presa. **T (Guardar tudo)** também devolve as ferramentas de torno para a torre.
- **Ver melhor:** botão **🔍 VER TORRE** aproxima a câmera da torre. A alavanca preta do avanço ficou menor e a mangueira de fluido passa por trás, sem cobrir a torre.
- **Guardar:** **R** (ou botão MÃO LIVRE) guarda o item da mão na mochila; R de novo tira ele. **T** (ou botão GUARDAR TUDO) devolve tudo ao lugar: ferramentas ao armário, cilindros e blocos à bancada de materiais, peças prontas à caixinha da máquina e os EPIs à mesa da entrada.
- **Leitor X/Y/Z da fresadora:** começa em 0,000 e mostra em mm o deslocamento real: X e Y pelos volantes da mesa (e durante o corte), Z pelo joelho e pelo mangote.
- **Mesa de EPI na entrada:** os óculos e o protetor auricular ficam numa mesinha logo na entrada (seta azul). Mire e aperte **E** para pegar e equipar. **G** tira e coloca os EPIs; as máquinas só ligam com eles colocados. Saiu a bandeja de EPI de cima do painel da fresadora (os da parede ficam só de enfeite).
- **Boneco novo:** macacão com colete refletivo, capacete com aba, rosto, luvas, joelheiras, botas e mochila. Quando os EPIs estão colocados, os óculos e o protetor auricular aparecem no boneco.
- **Item na mão:** qualquer item selecionado na mochila (cilindro, bloco, peça pronta ou ferramenta) aparece pequeno na mão, em 1ª e em 3ª pessoa.
- **Vista estilo Minecraft:** **V** ou **F5** alternam 1ª pessoa → 3ª pessoa de costas → 3ª pessoa de frente.
- **Painel da fresadora:** o leitor X/Y/Z agora fica em cima do painel, bem visível; o visor verde de RPM ficou maior; os botões ficaram maiores, em coluna, com o nome ao lado (LIGA/DESLIGA, RPM −, USINAR).
- **Removidos:** botão de VR, a seção "Biblioteca visual" da página e a cerca amarela.
- **Menos lag:** sombras recalculadas a cada 2 quadros, resolução interna limitada, oclusão de ambiente começa desligada (botão SOMBRA 3D liga), sem as luzes internas do armário e objetos fixos da sala sem recálculo por quadro.
- **EPI no início:** óculos de proteção e protetor auricular ficam numa bandeja em cima do painel da fresadora (seta azul em cima). Mire e aperte **E** (ou clique) para equipar. As máquinas só ligam (manual e automático) com os dois EPIs; o indicador no canto mostra "ÓCULOS ✓ / PROTETOR AURICULAR ✓". Com os óculos, aparece uma moldura bem leve nas bordas da tela. Os EPIs pendurados na parede também podem ser pegos.
- **Ferramenta na mão:** a ferramenta selecionada na mochila aparece pequena numa luva no canto inferior direito (e na mão do boneco na 3ª pessoa).
- **Esc = pausa:** abre um menu pequeno com **Continuar** e **Redefinir do zero** (clique duas vezes para confirmar). Redefinir apaga saldo, mochila e progresso e recomeça a simulação.
- **Painel da fresadora:** saiu a bolinha vermelha (lâmpada de status) do canto do painel.
- **Janelas discretas:** a dica de ação (pegar, vender, colocar peça, apertar mandril, esvaziar cavaco, instalar ferramenta) saiu do meio da tela e fica embaixo, perto da mochila. Ela aparece por 5 segundos e some; volta enquanto você mira no objeto (peça, máquina, balcão). Mirar numa peça também escolhe ela para o **E**.
- Os avisos curtos sumirem em ~3 s; a janelinha da ferramenta fecha sozinha se o mouse não estiver em cima dela.
- As faixas de dicas de teclas e a etiqueta da estação somem depois de 5 s. **H** mostra de novo (ou passe o mouse na parte de baixo da tela fora do modo mira). O saldo continua sempre visível.
- **Ferramentas na mochila:** mire numa ferramenta do armário e aperte **E** para pegar (ela some da prateleira e aparece na mochila com o ícone ⚒). Com a ferramenta selecionada, chegue perto da máquina certa e aperte **E** para instalar e prender. **Retirar ferramenta** devolve ao armário; **Q** com a ferramenta selecionada também devolve. Ferramentas não são vendidas no balcão. O clique continua abrindo a janelinha da ferramenta.
- **Placa de EPI:** nas paredes ao lado do torno e da fresadora há a placa azul "USE EPI • obrigatório nesta área" com **protetor ocular** e **protetor auricular**; embaixo da placa da esquerda ficam óculos de proteção e abafador pendurados.
- **Sem janela no volante do carro e no armário:** perto do volante do carro do torno, **E** engata/solta o volante (A/D giram); perto do armário, **E** abre/fecha as portas. Não aparece mais caixa na tela, e essas ações só usam o E quando não há outra coisa por perto (pegar, vender, colocar peça). Com o volante engatado, o indicador do canto mostra "VOLANTE ENGATADO".
- **Cilindro:** o material redondo do torno agora se chama **cilindro** (antes "tarugo") em todo o jogo.
- **Botão do mandril:** o torno tem um botão amarelo **MANDRIL** no painel. Apertar (ou clicar na própria placa, ou a tecla **M** perto do torno) aperta e solta as castanhas. Precisa ter um cilindro colocado e o torno desligado.
- **Janelas menores:** a janela das ferramentas, os avisos, as dicas, o guia rápido e o visualizador de modelos ficaram mais compactos.
- **Mochila com 5 espaços:** barra rápida embaixo da tela com os 5 itens; as teclas **1** a **5** escolhem o item (clique também funciona).
- **Cavaco voando:** durante a usinagem saem aparas da ferramenta (da cor do material) que sobem, caem e somem. No torno elas caem na bandeja; na fresadora caem sobre a peça e a mesa.
- **Bandeja de cavaco do torno:** a cada peça torneada a bandeja embaixo do torno enche (cheia em 5 peças). Cheia, o torno não usina mais até esvaziar: aperte **X** perto do torno ou o botão **Esvaziar cavaco** no painel. No automático o torno espera e continua sozinho depois de esvaziar.
- **Sem carrinho e sem mesa de peças prontas:** saíram o carrinho de ferramentas e a mesa atrás do balcão. A peça pronta cai na caixinha ao lado da máquina; se encher, vai para a mochila.
- **Lado esquerdo do torno livre:** saíram a mesa de MATERIAIS com barras e a bancada com cabos de ferramenta. O material bruto fica só na bancada de materiais (cilindros e blocos).
- **Saldo zerado:** o jogo começa com R$ 0,00 (o saldo antigo salvo no navegador não é mais carregado).
- **Armário com ferramentas 3D:** fresas de topo Ø10 e Ø6, fresa de face, brocas Ø8 e Ø5, ferramenta de torneamento, barra de mandrilar, ferramenta de canal, chave da placa e paquímetro. Clique numa ferramenta (ou no botão **FERRAMENTAS**) para abrir uma janelinha com o modelo girando, a explicação e a faixa de RPM; **Instalar** já coloca e prende a ferramenta na máquina. As setas ‹ › passam pelas ferramentas.
- **Todas as manivelas da fresadora giram:** volantes X e Y da mesa, volante do joelho (sobe e desce a mesa), manete e volante fino do mangote, e a manivela da morsa. Setas azuis animadas aparecem em volta do que dá para girar quando você chega perto, e ao mirar a peça fica azul com a dica "SEGURE O CLIQUE".
- **Caixinha de peças prontas:** ao lado do torno (e da fresadora) há uma caixinha; a peça usinada cai nela. **E** vende, **F** guarda na mochila. Se a caixinha encher, a peça vai para a mesa de peças prontas e depois para a mochila.
- **Botão vermelho para tudo:** o vermelho da máquina (ou **Parar tudo** no painel) interrompe o ciclo automático, a passada e desliga o motor. A máquina fica parada até você apertar o **verde** (ou **Continuar automático**) de novo, e aí ela continua de onde parou, com as peças que faltavam.
- **Bancada de materiais:** a antiga bancada de peças avulsas agora guarda o material bruto: **cilindros** no tampo (para o torno) e **blocos** na prateleira de baixo (para a fresadora), em aço, alumínio, latão e bronze. O material pego volta sozinho alguns segundos depois. O torno só aceita cilindro e a fresadora só aceita bloco.
- **Manivelas e volantes que giram de verdade:** segure o clique (na mira, em 1ª pessoa, ou com o mouse na vista em órbita) sobre o volante do carro do torno, o volante da contraponta, os volantes X e Y da mesa da fresadora ou o manete do mangote. Eles giram enquanto o botão estiver pressionado.
- **Fins de curso:** o carro do torno para antes da placa e da ponta rotativa da contraponta (não atravessa mais), o mangote da fresadora para quando a ferramenta encosta na peça/morsa e a mesa não passa por baixo de uma ferramenta abaixada. No limite aparece o aviso e o sentido inverte no próximo giro.
- **Morsa consertada:** manivela perpendicular ao fuso (não cruza mais o parafuso nem a mesa); o mordente fecha e abre animado, encostando no bloco. As castanhas do torno também fecham animadas até encostar na barra.
- **Modo automático por máquina:** escolha Fresadora, Torno ou As duas, o material e a quantidade (1 a 5). Não precisa pegar barra nem selecionar item no inventário, e dá para trocar de estação e usar a outra máquina enquanto ele roda. Se a mesa de peças prontas lotar, a peça vai para a mochila; se tudo lotar, o ciclo espera e continua sozinho depois de uma venda. O botão Parar interrompe.
- **Mesa de peças prontas** mudou para perto do balcão de venda (longe das máquinas) e comporta 6 peças.
- **Peças avulsas à venda:** na bancada de peças avulsas, **E** vende a peça e **F** guarda na mochila. As barras da mesa de materiais voltam sozinhas alguns segundos depois de pegas.
- **Entrada em primeira pessoa:** ENTRAR NA OFICINA sempre começa em 1ª pessoa (V alterna para 3ª).
- **Colisão real nas máquinas:** o contorno do torno, da fresadora e dos móveis agora é um retângulo do tamanho real; não dá mais para entrar dentro das máquinas.
- **Apresentação em PDF:** `Oficina3D_Torno_e_Fresadora.pdf` (5 páginas) explica as duas máquinas.
- **Nenhuma peça no chão:** a engrenagem, o bloco e a porca que ficavam soltos pela oficina agora estão na nova **bancada de peças avulsas** (tampo + prateleira). A tecla **Q** também guarda o item nessa bancada em vez de largá-lo no chão.
- **Máquinas mais 3D:** reflexos de ambiente (PBR), pintura com verniz, aço retificado e materiais metálicos reais; sombras mais nítidas e sombras de contato sob cada móvel.
- **Oclusão de ambiente em tempo real (GTAO):** cantos, vãos e encaixes ganham sombra e as máquinas "assentam" no chão. O botão **SOMBRA 3D** alterna para o modo leve; se o computador não sustentar ~25 fps, o modo leve liga sozinho. No VR fica desligada.
- **Torno:** placa de 3 castanhas torneada com castanhas escalonadas, nariz do fuso, barramento com guia prismática em V e cremalheira dentada, caixa Norton com alavancas, contraponta redesenhada (corpo fundido, mangote, volante e ponta rotativa), proteção de policarbonato da placa, proteção traseira contra cavacos, bandeja com cavacos, motor aletado com correias, portas com puxadores, luminária articulada e mangueira de fluido que acompanha o carro.
- **Fresadora:** cabeçote elevado para a ferramenta ficar visível acima da morsa, mangote que desce junto com a fresa, fresas e brocas com canais helicoidais, porta-ferramenta cônico, mesa com rasgos em T reais, base giratória graduada da morsa, avanço automático, batentes, motor vertical aletado, caixa de polias, leitor digital (DRO), guias rabo de andorinha e bomba de refrigeração. Durante o corte **a mesa se desloca** sob a fresa, como numa fresadora real.
- Máquinas com mais detalhes mecânicos em 3D: volantes raiados, filetes helicoidais em fusos, parafusos, fixadores, mangueira segmentada de fluido, decalques e componentes extras.
- Fresadora e torno com botões cianos para iniciar um ciclo automático em cada máquina.
- Personagem em primeira pessoa com mãos enluvadas, agachamento (C ou Ctrl), pulo (Espaço), corrida (Shift) e movimentação por WASD.
- Mesa lateral com barras de aço, latão, bronze e ouro; pressione E quando aparecer o aviso de coleta.
- Inventário com 12 espaços, seleção de item, opção de soltar item com Q e salvamento local no navegador.
- Ao terminar a usinagem, a peça pronta aparece na mesa de peças prontas, ao lado do balcão de venda. Use E para vender ou F para guardá-la na mochila.
- Saldo inicial zerado (R$ 0), preços fictícios e balcão de venda modelado dentro da oficina.
- Tecla I destaca o inventário; tecla V alterna para a visão de inspeção orbital.
- Galeria inicial com imagens ilustrativas de torno mecânico e fresadora vertical.
- Clique em uma imagem da galeria para ampliar.
- Botão **Abrir pasta de imagens** para selecionar uma pasta do computador e exibir suas imagens na página.
- Botão **Adicionar imagens** para selecionar várias imagens de uma vez.
- Visualizador 3D separado para arquivos `.glb`, com órbita, zoom e deslocamento da câmera.
- Mantém o simulador de usinagem, os controles de caminhada e o botão ENTER VR da versão anterior.

## Como executar no Windows
1. Extraia o ZIP.
2. Abra a pasta `oficina_usinagem_3d_estudio` no Visual Studio Code.
3. Instale a extensão **Live Server**.
4. Clique com o botão direito em `index.html` e selecione **Open with Live Server**.
5. Mantenha a internet conectada porque Three.js, GLTFLoader e fontes são carregados de CDN.

Também é possível rodar `npx vite` dentro da pasta, se o Node.js estiver instalado.

## Operação didática
- Escolha a fresadora ou o torno e selecione o material.
- Para fazer tudo em sequência, escolha o material e clique em **Colocar tudo no automático**. O ciclo prepara e prende uma peça, instala e prende a ferramenta, ajusta o RPM, liga a máquina, usina, desliga e coloca o resultado na mesa de venda.
- Para operar manualmente, carregue e fixe a peça, instale a ferramenta, regule o RPM, ligue a máquina e execute a passada simulada.
- No torno desligado, clique no manete de avanço para deslocar o carro; também é possível engatar o volante com **E** e movê-lo com **A/D**.
- Caminhe com **W/A/S/D**, olhe com o mouse, **Shift** corre, **C/Ctrl** agacha, **Espaço** pula, **E** coleta/interage, **F** guarda a peça da mesa na mochila, **Q** solta o item selecionado e **I** destaca o inventário; **V** alterna para inspeção orbital e **Esc** libera o ponteiro.
- Em headset VR compatível, use **ENTER VR** depois de abrir a página em HTTPS ou localhost. O suporte depende do navegador e do dispositivo.

## Movimentação, peças e vendas
- **C** ou **Ctrl**: agachar; **Espaço**: pular; **Shift**: correr.
- **V**: alternar primeira/terceira pessoa; o botão “Inspecionar em órbita” mantém a câmera orbital de inspeção.
- **E**: pegar um material próximo, vender uma peça pronta na mesa de peças prontas (ao lado do balcão) ou interagir com o balcão. **F** guarda a peça pronta na mochila. No VR, aponte o controle para a peça ou mesa e aperte o gatilho para vender.
- **I**: destacar/rolar até o inventário. Clique num slot para selecioná-lo e use **Q** para soltar o item selecionado: ele volta para um encaixe livre da **bancada de materiais** (nada fica no chão).
- Há 5 espaços no inventário. A mesa de peças prontas (ao lado do balcão de venda) comporta seis peças; se lotar, a peça vai para a mochila; venda cada peça ali com **E** ou pressione **F** para levá-la à mochila.
- O saldo e o inventário ficam salvos no `localStorage` desse navegador. Os preços são fictícios e locais ao projeto, sem pagamentos reais.

## Segurança e limitações
A caminhada, o salto, o agachamento, a coleta, o inventário, a economia e as operações de corte são sistemas de jogo demonstrativos. A visão em terceira pessoa usa um personagem geométrico simples com capacete e colete; a primeira pessoa mostra mãos enluvadas. No VR, o headset fornece a altura da cabeça (agachar fisicamente acompanha o usuário); o pulo por tecla não é simulado no headset. As operações de corte são animações para fins educacionais. Os RPM são ilustrativos, não recomendações de processo. O simulador não controla máquinas reais e não substitui treinamento supervisionado, avaliação de fixação, seleção de velocidades de corte ou procedimentos de segurança industrial.
