package com.elementarysoftware.prism;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Properties;
import java.util.Vector;
import io.iohk.atala.prism.api.KeyGenerator;
import io.iohk.atala.prism.crypto.derivation.KeyDerivation;
import io.iohk.atala.prism.crypto.derivation.MnemonicCode;
import io.iohk.atala.prism.crypto.keys.ECKeyPair;
import io.iohk.atala.prism.identity.Did;
import io.iohk.atala.prism.identity.LongFormPrismDid;
import io.iohk.atala.prism.identity.PrismDid;
import io.iohk.atala.prism.identity.PrismKeyType;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.xml.sax.SAXException;

import com.elementarysoftware.io.FileOperations;
import com.elementarysoftware.vdcb.Session;
import com.elementarysoftware.vdcb.Settings;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import java.nio.file.Paths;
import java.sql.Blob;
import java.sql.Clob;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public class DIDVault {

	private File rootDirectory;
	private File rootDbDirectory;
	//List<String> didNames = new Vector<String>();
	//List<String> didSeedFilePaths = new Vector<String>();
	List<DID> dids; // = new Vector<DID>();
	//private String rootJDBCDirectoryPath = "jdbc:derby:./vaults/";
	private Settings settings;

	/*public DIDVault(Settings s) throws FileNotFoundException {

		//this(new File("did_vault"));
		this(new File("vaults"), s);
		
	}*/

	public DIDVault(Settings s) throws FileNotFoundException {

		File f = new File((String)s.get(Settings.ROOT_DIRECTORY));
		
		if(f.isDirectory()) {
			rootDbDirectory = f;
			loadDIDs();
		}
		else {
			if(f.mkdirs()) {
				rootDbDirectory = f;
			}
			else {
				throw new FileNotFoundException("Unable to create DID Vault root directory");
			}
		}
		
	}
	
	public DID restoreFromSeedPhrases(String name, List<String> seedPhrases, String passphrase) throws Exception {

		MnemonicCode code = new MnemonicCode(seedPhrases);

		KeyDerivation keyder = KeyDerivation.INSTANCE;

		byte[] seed = keyder.binarySeed(code, passphrase);

		KeyGenerator generator = KeyGenerator.INSTANCE;

		ECKeyPair masterKeyPair = generator.deriveKeyFromFullPath(seed, 0, PrismKeyType.INSTANCE.getMASTER_KEY(), 0);

		LongFormPrismDid unpublishedDid = PrismDid.buildLongFormFromMasterPublicKey(masterKeyPair.getPublicKey());

		Did didCanonical = unpublishedDid.asCanonical().getDid();
		Did didLongForm = unpublishedDid.getDid();

		System.out.println("canonical: "+ didCanonical);
		System.out.println("long form: "+ didLongForm);

		/*
		DocumentBuilderFactory docFactory = DocumentBuilderFactory.newInstance();
		DocumentBuilder docBuilder = docFactory.newDocumentBuilder();

		Document doc = docBuilder.newDocument();
		Element rootElement = doc.createElement("did");
		rootElement.setAttribute("name", name);
		doc.appendChild(rootElement);


		File didMetadata = File.createTempFile("did_", ".xml", rootDirectory);

		File seedFile = new File(didMetadata.getAbsolutePath()+"_seed.bytes");
		try (FileOutputStream fos = new FileOutputStream(seedFile)) {
			fos.write(seed);
			//fos.close // no need, try-with-resources auto close
		}

		Element seedElement = doc.createElement("seed");
		seedElement.setTextContent(seedFile.getAbsolutePath());
		rootElement.appendChild(seedElement);

		// write DOM document to a file
		try (FileOutputStream output =
				new FileOutputStream(didMetadata.getAbsolutePath())) {
			FileOperations.writeXml(doc, output);
		} catch (IOException e) {
			e.printStackTrace();
		}
		*/
		
		settings.put(Session.CURRENT_DID, new DID(name, settings));
		settings.put(Session.PASSPHRASE, passphrase);

		createNewVault(name, seed);
		
		//return new DID(name, vaultUrl);
		return new DID(name, settings);
	}


	private void loadDIDs() {

		dids = new Vector<DID>();
		
		// loop through vault and get name of all dids
		//List<String> files = new Vector<String>();
		
		System.out.println("Loading vaults from "+ rootDbDirectory);
		// loop through the vaults directory and create did object for each of the database folders
		String[] vaults = rootDbDirectory.list();
		for(int i = 0; i < vaults.length; i++) {
			System.out.println("vault found "+ vaults[i]);
			File tmpVault = new File(vaults[i]);
			//if(tmpVault.isDirectory()) {
			//	System.out.println("vault added "+ vaults[i]);
				//dids.add(new DID(tmpVault.getName(), rootJDBCDirectoryPath + tmpVault.getName()));
			dids.add(new DID(tmpVault.getName(), settings));
			//}
			//else {
			//	System.out.println("can read: "+tmpVault.canRead()+ ", path: "+ tmpVault.getAbsolutePath() + ", is directory: "+ tmpVault.isDirectory() + ", is file: "+ tmpVault.isFile() );
			//}
		}
		
		/*
		// Instantiate the Factory
		DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
		try {
			// optional, but recommended
			// process XML securely, avoid attacks like XML External Entities (XXE)
			dbf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);

			// parse XML file
			DocumentBuilder db = dbf.newDocumentBuilder();


			files = FileOperations.findFiles(Paths.get(rootDirectory.getAbsolutePath()), "xml");

			//didNames.clear();
			//didSeedFilePaths.clear();

			for(int i = 0; i < files.size(); i++) {
				System.out.println("reading file "+ files.get(i));
				Document doc = db.parse(new File(files.get(i)));
				doc.getDocumentElement().normalize();

				Node xml_did = doc.getElementsByTagName("did").item(0);
				
				if(xml_did == null) continue;
				
				Element elem_did = (Element) xml_did;

				DID tmpDID = new DID(elem_did.getAttribute("name"), files.get(i));
				dids.add(i, tmpDID);
				//didNames.add(elem_did.getAttribute("name"));

				//didSeedFilePaths.add(elem_did.getElementsByTagName("seed").item(0).getTextContent());

			}

		}
		catch (SAXException saxe) {
			System.err.println("Error reading DID settings. "+ saxe.getMessage());
		}
		catch (ParserConfigurationException pce) {
			System.err.println("Error reading DIDs. "+ pce.getMessage());
		}
		catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}*/

	}

	public String[] getDIDNames() {
		List<String> didNames = new Vector<String>(dids.size());
		for(int i = 0; i < dids.size(); i++) {
			didNames.add(i, dids.get(i).getName());
		}
		return didNames.toArray(String[]::new);
	}

	

	/*public String getDIDSeed(int didIndex) {
		//return didSeedFilePaths.get(didIndex);
		return dids.get(didIndex).getSeedFilePath();
	}*/

	public DID createNewDID(String name, String passphrase) throws Exception {

		KeyDerivation keyder = KeyDerivation.INSTANCE;

		byte[] seed = keyder.binarySeed(keyder.randomMnemonicCode(), passphrase);

		KeyGenerator generator = KeyGenerator.INSTANCE;

		ECKeyPair masterKeyPair = generator.deriveKeyFromFullPath(seed, 0, PrismKeyType.INSTANCE.getMASTER_KEY(), 0);

		LongFormPrismDid unpublishedDid = PrismDid.buildLongFormFromMasterPublicKey(masterKeyPair.getPublicKey());

		Did didCanonical = unpublishedDid.asCanonical().getDid();
		Did didLongForm = unpublishedDid.getDid();

		System.out.println("canonical: "+ didCanonical);
		System.out.println("long form: "+ didLongForm);

		settings.put(Session.CURRENT_DID, new DID(name, settings));
		settings.put(Session.PASSPHRASE, passphrase);
 		
		createNewVault(name, seed);

		//return new DID(name, vaultUrl);
		return new DID(name, settings);
	}

	public DID[] getAllDIDs() {
		return dids.toArray(DID[]::new);
	}

	private String createNewVault(String databaseName, byte[] seed) {
		
		String defaultOperationHash = "0000000000000000000000000000000000000000000000000000000000000000";
		String dbUrl = "";
		Properties props = (Properties) settings.get(Session.VAULT_PROPERTIES); 
		String vaultURL = (String) settings.get(Session.VAULT_JDBC_URL);
		
		Connection conn;
		try {
			conn = DriverManager.getConnection(vaultURL+";create=true", props);
				
			DatabaseMetaData dbInfo = conn.getMetaData();
			System.out.println("Database product = "+ dbInfo.getDatabaseProductName());
			System.out.println("Database driver = "+ dbInfo.getDriverName());
			System.out.println("Database url = "+ dbInfo.getURL());
			System.out.println("Connected as user = "+ dbInfo.getUserName());
			
			Statement createDidTableStmt = conn.createStatement();
			
			createDidTableStmt.execute("CREATE TABLE did(name VARCHAR(60), latest_operation_hash CHAR(64), seed BLOB)");
			System.out.println("DID table created");
			createDidTableStmt.close();
			
			Statement createContactTableStmt = conn.createStatement();
			createContactTableStmt.execute("CREATE TABLE contact(name VARCHAR(60), did_string CLOB)");
			System.out.println("contact table created");
			createContactTableStmt.close();
			
			String query = "INSERT INTO did(name,latest_operation_hash, seed) VALUES (?, ?, ?)";
		    PreparedStatement pstmt;
		    pstmt = conn.prepareStatement(query);
			pstmt.setString(1, props.getProperty("user"));
			
			pstmt.setString(2, defaultOperationHash);
			
			// lagring av byte[] i BLOB kolonne: https://db.apache.org/derby/docs/10.13/ref/rrefblob.html
			Blob seedBlob = conn.createBlob();
		    seedBlob.setBytes(1, seed);
		   
		    pstmt.setBlob(3, seedBlob);
		    
		    if(pstmt.execute()) {
		    	System.out.println("Vault created and initialized for "+ props.getProperty("user"));
		    	dbUrl = dbInfo.getURL();
		    }
		    	
		    seedBlob.free();
		    pstmt.close();
			
			
			return dbUrl;
			
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return dbUrl;
			
	}
	
	/*
	public void addAliceContactsToVault(Connection conn) {
		
		String query = "INSERT INTO contact(name,did_string) VALUES (?, ?)";
	    PreparedStatement pstmt;
		try {
			pstmt = conn.prepareStatement(query);
			pstmt.setString(1, "Bob");
		    Clob didString = conn.createClob();
		    didString.setString(1, "did:prism:5238e7f246c0af5284439f0324962d4fe6135f13d5946d753390a9528cd45579:Cj8KPRI7CgdtYXN0ZXIwEAFKLgoJc2VjcDI1NmsxEiECpwYDXnIlYa0OtDiSSgtEhSOGDDh3e5nNF1uduHDcXxg");
		    pstmt.setClob(2, didString);
		    pstmt.execute();
		    System.out.println("Bob inserted .....");
		    didString.free();
		    pstmt.close();
		    
		    pstmt = conn.prepareStatement(query);
			pstmt.setString(1, "Charlie");
		    didString = conn.createClob();
		    didString.setString(1, "did:prism:62441b3634f80655b13b0b7b670e307f0429f8e7ece8f8cdf318b6530a5abb98:Cj8KPRI7CgdtYXN0ZXIwEAFKLgoJc2VjcDI1NmsxEiEDQdICjEcope89n_H_tOFqZ7HKLSUXaBxBolEqROuNZMs");
		    pstmt.setClob(2, didString);
		    pstmt.execute();
		    System.out.println("Charlie inserted .....");
		    didString.free();
		    pstmt.close();
		    
		    conn.close();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	    
	}
	
	public void queryAlice(Connection conn) {
		
		System.out.println("query Alice");
		String selectQuery = "SELECT * FROM did WHERE name LIKE 'Alice'";
		try {
			Statement selectAliceStmt = conn.createStatement();
			
			ResultSet rs = selectAliceStmt.executeQuery(selectQuery);
			
			while (rs.next()) {
				System.out.println("name = "+ rs.getString("name"));
				
				Blob blob = rs.getBlob("seed");

				int blobLength = (int) blob.length();
				System.out.println("length of seed "+ blobLength);
				byte[] seed = blob.getBytes(1, blobLength);

				System.out.println(seed);
				
				//release the blob and free up memory. (since JDBC 4.0)
				blob.free();
			
			}
			
			selectAliceStmt.close();
			
			conn.close();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} 
	    
	}*/


	public boolean containsDID(String didNameToCheck) {
		for(int i = 0; i < dids.size(); i++) {
			if(dids.get(i).getName().toLowerCase().equals(didNameToCheck.toLowerCase())) return true;
		}
		return false;
	}

	/*public void setDIDOperationHash(DID did, String operationHash) {

		//didSeedFilePaths.indexOf(loadedDID)

	}*/


}
